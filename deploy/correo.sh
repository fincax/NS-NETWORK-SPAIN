#!/usr/bin/env bash
# NS Network · correo saliente desde el buzón de NS (D-060).
#   bash /opt/ns-network/deploy/correo.sh configurar   pregunta los datos del buzón, los guarda y reinicia la web
#   bash /opt/ns-network/deploy/correo.sh probar tu@correo   envía un correo de prueba
#   bash /opt/ns-network/deploy/correo.sh quitar       deja de enviar correos (vuelve a mostrar los enlaces a la Directiva)
set -euo pipefail
APP=/opt/ns-network/apps/web
ENV=$APP/.env.production
[[ -f $ENV ]] || { echo "No encuentro $ENV. ¿Está instalado NS Network en este servidor?"; exit 1; }

reiniciar() { cd $APP; set -a; source "$ENV"; set +a; pm2 restart ns-network --update-env >/dev/null; pm2 save >/dev/null; }

quitar_variables() { sed -i '/^NS_SMTP_HOST=/d;/^NS_SMTP_PORT=/d;/^NS_SMTP_USER=/d;/^NS_SMTP_PASSWORD=/d;/^NS_MAIL_FROM=/d;/^# Correo saliente (D-060)/d' "$ENV"; }

probar() {
  local destino=${1:-}
  [[ -n $destino ]] || read -r -p "¿A qué correo envío la prueba? " destino
  cd $APP
  set -a; source "$ENV"; set +a
  pnpm --silent correo:prueba "$destino"
}

case "${1:-}" in
  configurar)
    echo "Datos del buzón que enviará los correos (te los da tu proveedor de correo, en 'SMTP' o 'correo saliente')."
    read -r -p "Servidor SMTP (por ejemplo smtp.tuproveedor.com): " host
    read -r -p "Puerto [465]: " port; port=${port:-465}
    read -r -p "Usuario [hola@networkspain.com]: " user; user=${user:-hola@networkspain.com}
    read -r -s -p "Contraseña del buzón (no se ve al escribir): " pass; echo
    host=$(echo "$host" | tr -d '[:space:]'); port=$(echo "$port" | tr -d '[:space:]'); user=$(echo "$user" | tr -d '[:space:]')
    [[ -n $host && -n $pass ]] || { echo "Faltan el servidor o la contraseña. No se ha cambiado nada."; exit 1; }
    [[ $pass != *"'"* ]] || { echo "La contraseña lleva una comilla simple ('), que este archivo no admite. Cámbiala en tu proveedor y vuelve a lanzar esto."; exit 1; }
    quitar_variables
    {
      echo "# Correo saliente (D-060)"
      echo "NS_SMTP_HOST=$host"
      echo "NS_SMTP_PORT=$port"
      echo "NS_SMTP_USER=$user"
      echo "NS_SMTP_PASSWORD='$pass'"
      echo "NS_MAIL_FROM=\"NS Network <$user>\""
    } >> "$ENV"
    chmod 600 "$ENV"
    reiniciar
    echo "Guardado y web reiniciada. Ahora te envío un correo de prueba."
    probar
    ;;
  probar)
    probar "${2:-}"
    ;;
  quitar)
    quitar_variables
    unset NS_SMTP_HOST NS_SMTP_PORT NS_SMTP_USER NS_SMTP_PASSWORD NS_MAIL_FROM
    reiniciar
    echo "Correo saliente desactivado. Los enlaces de acceso vuelven a mostrarse a la Directiva."
    ;;
  *)
    echo "Uso: bash $0 configurar | probar [correo] | quitar"; exit 2 ;;
esac
