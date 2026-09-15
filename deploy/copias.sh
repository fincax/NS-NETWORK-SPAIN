#!/usr/bin/env bash
# =====================================================================
#  NS Network · copias de seguridad de la base de datos (D-056)
#
#  Cada copia se cifra, se prueba restaurándola en una base de datos aparte,
#  se envía fuera del servidor si hay un remoto configurado y deja su estado
#  en un fichero que la aplicación muestra a la Directiva.
#
#  Uso (como root):
#    bash copias.sh instalar               clave, carpetas, cron nocturno (03:30) y primera copia probada
#    bash copias.sh hacer                  copia + prueba de restauración + envío fuera del servidor
#    bash copias.sh listar                 copias disponibles y último estado
#    bash copias.sh probar <archivo>       restaura una copia en una base de datos de prueba y la borra
#    bash copias.sh restaurar <archivo>    sustituye la base de datos real por la copia (pide confirmación;
#                                          la base anterior se conserva renombrada)
#
#  Fuera del servidor: si existe un remoto de rclone llamado "ns-copias", las copias cifradas
#  se sincronizan en él (carpeta ns-network-copias). Ver docs/17 §4c.
# =====================================================================
set -euo pipefail

DIR_COPIAS=/var/backups/ns-network
CLAVE=/root/.ns-copias-clave
ESTADO_DIR=/var/lib/ns-network
ESTADO=$ESTADO_DIR/copias.json
LOG=/var/log/ns-copias.log
DB=${NS_DB:-ns}
DB_PRUEBA=ns_prueba_copia
REMOTO=ns-copias
CARPETA_REMOTA=ns-network-copias
RETENCION_DIAS=30
CRON_FILE=/etc/cron.d/ns-copias
SCRIPT=$(readlink -f "$0")

# sudo limpia el entorno: la opción de silenciar avisos viaja en la propia orden.
pg() { sudo -u postgres env PGOPTIONS="-c client_min_messages=warning" "$@"; }
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $*"; }
raiz() { if [[ "$(id -u)" != "0" ]]; then echo "Ejecútalo como root."; exit 1; fi; }
psql_db() { pg psql -v ON_ERROR_STOP=1 -tAX -d "$1" -c "$2"; }
json_str() { printf '%s' "$1" | tr -d '\000-\037' | sed 's/\\/\\\\/g; s/"/\\"/g'; }

# ---------------------------------------------------------------- estado
escribir_estado() {
  # escribir_estado ok archivo bytes sha restoreTested restoreOk tablas empresas candidaturas cesiones offsite conservadas segundos error
  mkdir -p "$ESTADO_DIR"
  cat > "$ESTADO.tmp" <<JSON
{
  "ranAt": "$(date -u '+%Y-%m-%dT%H:%M:%SZ')",
  "ok": $1,
  "file": "$(json_str "$2")",
  "sizeBytes": ${3:-0},
  "sha256": "$4",
  "restoreTested": $5,
  "restoreOk": $6,
  "tables": ${7:-0},
  "companies": ${8:-0},
  "betaRequests": ${9:-0},
  "referrals": ${10:-0},
  "offsite": "${11}",
  "kept": ${12:-0},
  "durationSec": ${13:-0},
  "error": $( [[ -z "${14:-}" ]] && echo null || echo "\"$(json_str "${14}")\"" )
}
JSON
  mv "$ESTADO.tmp" "$ESTADO"
  chmod 644 "$ESTADO"
}

# ---------------------------------------------------------------- medidas
contar() { # contar <db> → "tablas empresas candidaturas cesiones"
  local d=$1
  local t e c r
  t=$(psql_db "$d" "select count(*) from information_schema.tables where table_schema='public'")
  e=$(psql_db "$d" "select count(*) from companies" 2>/dev/null || echo 0)
  c=$(psql_db "$d" "select count(*) from beta_requests" 2>/dev/null || echo 0)
  r=$(psql_db "$d" "select count(*) from referrals" 2>/dev/null || echo 0)
  echo "$t $e $c $r"
}

# ---------------------------------------------------------------- probar
# Restaura <archivo> en $DB_PRUEBA (se crea y se borra aquí) y compara con la base real.
probar_archivo() {
  local archivo=$1
  [[ -f "$archivo" ]] || { echo "No existe $archivo"; return 1; }
  [[ -f "$CLAVE" ]] || { echo "Falta la clave $CLAVE"; return 1; }
  local tmp
  tmp=$(mktemp "$DIR_COPIAS/.prueba-XXXXXX")
  chmod 600 "$tmp"
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass "file:$CLAVE" -in "$archivo" -out "$tmp"
  pg dropdb --if-exists "$DB_PRUEBA"
  pg createdb -O "$DB" "$DB_PRUEBA"
  # --role=ns: los objetos quedan en manos del usuario de la aplicación, como en la base real.
  pg pg_restore --no-owner --role="$DB" --exit-on-error -d "$DB_PRUEBA" < "$tmp"
  rm -f "$tmp"
  local real prueba
  real=$(contar "$DB"); prueba=$(contar "$DB_PRUEBA")
  pg dropdb --if-exists "$DB_PRUEBA"
  read -r rt re rc rr <<< "$real"
  read -r pt pe pc pr <<< "$prueba"
  log "prueba de restauración · real: $rt tablas, $re empresas, $rc candidaturas, $rr Cesiones · restaurada: $pt tablas, $pe empresas, $pc candidaturas, $pr Cesiones"
  if [[ "$rt" != "$pt" || "$re" != "$pe" ]]; then
    echo "La copia restaurada no coincide con la base real (tablas $rt/$pt, empresas $re/$pe)."; return 1
  fi
  echo "$pt $pe $pc $pr"
}

# ---------------------------------------------------------------- hacer
hacer() {
  raiz
  local inicio=$SECONDS
  mkdir -p "$DIR_COPIAS" "$ESTADO_DIR"; chmod 700 "$DIR_COPIAS"
  [[ -f "$CLAVE" ]] || { echo "Falta la clave de cifrado $CLAVE. Lanza: bash $SCRIPT instalar"; exit 1; }
  local archivo="$DIR_COPIAS/ns-$(date '+%Y%m%d-%H%M%S').dump.enc"
  local error="" ok=false restoreTested=false restoreOk=false offsite=unconfigured bytes=0 sha="" conservadas=0
  local t=0 e=0 c=0 r=0
  # Si algo falla antes de que la copia esté probada, no se conserva el archivo: una copia no probada no es una copia.
  trap '[[ $restoreOk == true ]] || rm -f "$archivo"; escribir_estado false "$archivo" "$bytes" "$sha" $restoreTested $restoreOk 0 0 0 0 "$offsite" "$conservadas" $((SECONDS-inicio)) "${error:-fallo en: $BASH_COMMAND}"; log "FALLO: ${error:-$BASH_COMMAND}"; exit 1' ERR

  log "copia → $archivo"
  pg pg_dump -Fc "$DB" | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass "file:$CLAVE" -out "$archivo" || { error="pg_dump o el cifrado fallaron"; false; }
  chmod 600 "$archivo"
  bytes=$(stat -c %s "$archivo"); sha=$(sha256sum "$archivo" | cut -d' ' -f1)
  [[ "$bytes" -gt 1024 ]] || { error="la copia ocupa solo $bytes bytes"; false; }

  restoreTested=true
  local medidas
  if medidas=$(probar_archivo "$archivo" | tail -n 1); then
    restoreOk=true; read -r t e c r <<< "$medidas"
  else
    error="la copia no se pudo restaurar"; false
  fi

  # retención local
  find "$DIR_COPIAS" -maxdepth 1 -name 'ns-*.dump.enc' -mtime +"$RETENCION_DIAS" -delete
  conservadas=$(find "$DIR_COPIAS" -maxdepth 1 -name 'ns-*.dump.enc' | wc -l)

  # fuera del servidor
  if command -v rclone >/dev/null 2>&1 && rclone listremotes 2>/dev/null | grep -qx "$REMOTO:"; then
    if rclone sync "$DIR_COPIAS" "$REMOTO:$CARPETA_REMOTA" --include 'ns-*.dump.enc' --quiet 2>>"$LOG"; then offsite=ok; else offsite=failed; fi
  fi

  ok=true
  trap - ERR
  escribir_estado true "$archivo" "$bytes" "$sha" $restoreTested $restoreOk "$t" "$e" "$c" "$r" "$offsite" "$conservadas" $((SECONDS-inicio)) ""
  log "OK · $((bytes/1024)) KB · restauración probada ($t tablas, $e empresas) · $conservadas copias conservadas · fuera del servidor: $offsite · $((SECONDS-inicio)) s"
}

# ---------------------------------------------------------------- instalar
instalar() {
  raiz
  command -v openssl >/dev/null || apt-get install -y -q openssl
  mkdir -p "$DIR_COPIAS" "$ESTADO_DIR"; chmod 700 "$DIR_COPIAS"
  local nueva=false
  if [[ ! -f "$CLAVE" ]]; then openssl rand -base64 48 | tr -d '\n' > "$CLAVE"; chmod 600 "$CLAVE"; nueva=true; fi
  cat > "$CRON_FILE" <<CRON
# Copia de seguridad nocturna de NS Network (D-056): cifrada, probada y enviada fuera del servidor si hay remoto.
30 3 * * * root bash $SCRIPT hacer >> $LOG 2>&1
CRON
  chmod 644 "$CRON_FILE"
  touch "$LOG"
  hacer
  echo
  echo "=============================================================="
  echo " Copias de seguridad instaladas."
  echo "   Cada noche a las 03:30 · cifradas · restauración probada en cada copia · $RETENCION_DIAS días."
  echo "   Carpeta: $DIR_COPIAS   Estado: $ESTADO   Registro: $LOG"
  if [[ "$nueva" == true ]]; then
    echo
    echo " CLAVE DE CIFRADO (nueva). Guárdala fuera del servidor: sin ella las copias no sirven."
    echo " ------------------------------------------------------------"
    cat "$CLAVE"; echo
    echo " ------------------------------------------------------------"
  fi
  if ! command -v rclone >/dev/null 2>&1 || ! rclone listremotes 2>/dev/null | grep -qx "$REMOTO:"; then
    echo
    echo " Las copias aún NO salen del servidor. Para enviarlas fuera, configura un remoto de rclone"
    echo " llamado '$REMOTO' (docs/17 §4c, apartado Copias) y la siguiente copia lo usará sola."
  fi
  echo "=============================================================="
}

# ---------------------------------------------------------------- listar
listar() {
  echo "Copias en $DIR_COPIAS:"
  ls -lh --time-style='+%Y-%m-%d %H:%M' "$DIR_COPIAS"/ns-*.dump.enc 2>/dev/null | awk '{print "  " $6 " " $7 "  " $5 "  " $8}' || echo "  (ninguna)"
  echo
  echo "Último estado ($ESTADO):"
  [[ -f "$ESTADO" ]] && cat "$ESTADO" || echo "  (sin estado: aún no se ha hecho ninguna copia)"
  if command -v rclone >/dev/null 2>&1 && rclone listremotes 2>/dev/null | grep -qx "$REMOTO:"; then
    echo; echo "Fuera del servidor ($REMOTO:$CARPETA_REMOTA):"; rclone ls "$REMOTO:$CARPETA_REMOTA" 2>/dev/null | tail -n 5
  fi
}

# ---------------------------------------------------------------- restaurar
restaurar() {
  raiz
  local archivo=${1:-}
  [[ -n "$archivo" && -f "$archivo" ]] || { echo "Uso: bash $SCRIPT restaurar $DIR_COPIAS/ns-AAAAMMDD-HHMMSS.dump.enc"; exit 1; }
  echo "Vas a sustituir la base de datos '$DB' por la copia $archivo."
  echo "La base actual se conservará renombrada; la aplicación se detiene unos segundos."
  read -r -p "Escribe 'restaurar' para continuar: " conf
  [[ "$conf" == "restaurar" ]] || { echo "Cancelado."; exit 1; }
  local tmp nueva="ns_restaurada" anterior="${DB}_anterior_$(date '+%Y%m%d_%H%M')"
  tmp=$(mktemp "$DIR_COPIAS/.restaurar-XXXXXX"); chmod 600 "$tmp"
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass "file:$CLAVE" -in "$archivo" -out "$tmp"
  pg dropdb --if-exists "$nueva"
  pg createdb -O "$DB" "$nueva"
  pg pg_restore --no-owner --role="$DB" --exit-on-error -d "$nueva" < "$tmp"
  rm -f "$tmp"
  command -v pm2 >/dev/null && pm2 stop ns-network >/dev/null 2>&1 || true
  psql_db postgres "select pg_terminate_backend(pid) from pg_stat_activity where datname='$DB' and pid<>pg_backend_pid()" >/dev/null
  psql_db postgres "alter database \"$DB\" rename to \"$anterior\""
  psql_db postgres "alter database \"$nueva\" rename to \"$DB\""
  command -v pm2 >/dev/null && pm2 start ns-network >/dev/null 2>&1 || true
  log "RESTAURADA $archivo → $DB (la anterior queda como $anterior)"
  echo "Hecho. La base anterior sigue disponible como '$anterior'; bórrala cuando confirmes que todo va bien:"
  echo "  pg dropdb $anterior"
}

case "${1:-}" in
  instalar) instalar ;;
  hacer) hacer ;;
  listar) listar ;;
  probar) raiz; probar_archivo "${2:-}" >/dev/null && echo "La copia se restaura correctamente." ;;
  restaurar) restaurar "${2:-}" ;;
  *) sed -n '2,20p' "$SCRIPT"; exit 1 ;;
esac
