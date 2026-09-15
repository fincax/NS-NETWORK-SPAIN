#!/usr/bin/env bash
# =====================================================================
#  NS Network · instalación en un servidor Ubuntu (Clouding) como root
#  Uso:  bash instalar.sh networkspain.com correo@tuempresa.es
#  Deja la aplicación en https://<dominio> con base de datos PostgreSQL local,
#  proceso vigilado por pm2, nginx delante con certificado HTTPS y la Ronda programada.
#  Es idempotente: si algo falla, corrígelo y vuelve a lanzarlo.
# =====================================================================
set -euo pipefail

DOMINIO="${1:-}"
CORREO="${2:-}"
if [[ -z "$DOMINIO" || -z "$CORREO" ]]; then
  echo "Uso: bash instalar.sh <dominio> <correo para el certificado>"; exit 1
fi
if [[ "$(id -u)" != "0" ]]; then echo "Ejecútalo como root."; exit 1; fi

REPO="https://github.com/fincax/NS-NETWORK-SPAIN.git"
DIR=/opt/ns-network
APP=$DIR/apps/web
ENV=$APP/.env.production

echo "== 1/9 · Paquetes del sistema"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q curl git ufw nginx postgresql postgresql-contrib certbot python3-certbot-nginx openssl

echo "== 2/9 · Node 22 y pnpm"
if ! command -v node >/dev/null || [[ "$(node -v | cut -d. -f1 | tr -d v)" -lt 22 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y -q nodejs
fi
corepack enable
corepack prepare pnpm@10.33.0 --activate
npm install -g pm2 >/dev/null

echo "== 3/9 · Cortafuegos (22, 80, 443)"
ufw allow OpenSSH >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
ufw --force enable >/dev/null

echo "== 4/9 · Base de datos PostgreSQL (local, solo accesible desde este servidor)"
DB_PASS_FILE=/root/.ns-db-password
if [[ ! -f $DB_PASS_FILE ]]; then openssl rand -hex 24 > $DB_PASS_FILE; chmod 600 $DB_PASS_FILE; fi
DB_PASS=$(cat $DB_PASS_FILE)
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ns') THEN CREATE ROLE ns LOGIN PASSWORD '$DB_PASS'; END IF;
END \$\$;
ALTER ROLE ns PASSWORD '$DB_PASS';
SQL
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='ns'" | grep -q 1 || sudo -u postgres createdb -O ns ns

echo "== 5/9 · Código"
if [[ -d $DIR/.git ]]; then git -C $DIR pull -q --ff-only; else git clone -q $REPO $DIR; fi
cd $DIR && pnpm install --frozen-lockfile

echo "== 6/9 · Variables de entorno"
if [[ ! -f $ENV ]]; then
  cat > $ENV <<VARS
# ---- NS Network · producción (demo privada) ----
NODE_ENV=production
DATABASE_URL=postgres://ns:$DB_PASS@127.0.0.1:5432/ns
NS_PUBLIC_URL=https://$DOMINIO

# Modo de acceso: demo = puerta compartida y selector de Timonel (datos ficticios); real = cuentas personales (D-054)
NS_AUTH_MODE=demo
DEMO_USER=demo
DEMO_PASSWORD=$(openssl rand -base64 12 | tr -d '/+=' | cut -c1-14)
DEMO_SESSION_SECRET=$(openssl rand -hex 32)
NS_SEED_PASSWORD=$(openssl rand -base64 12 | tr -d '/+=' | cut -c1-14)

# Tareas programadas (la Ronda y la Mesa) se autentican con esto
CRON_SECRET=$(openssl rand -hex 32)

# Fuentes públicas reales para el Rastreo (D-051): real | sample
NS_PUBLIC_FEEDS=real

# Modelo de los Agentes. Sin clave, razonan con reglas fijas. Con clave, con Claude y la Mesa corre en segundo plano (D-053).
# ANTHROPIC_API_KEY=sk-ant-...
# NS_LLM_MODEL=claude-opus-5
VARS
  chmod 600 $ENV
  echo "   Creado $ENV con contraseñas nuevas."
else
  echo "   $ENV ya existía: no se toca."
fi

echo "== 7/9 · Construir y arrancar"
cd $APP
set -a; source $ENV; set +a
pnpm build
pm2 delete ns-network >/dev/null 2>&1 || true
pm2 start "pnpm start" --name ns-network --cwd $APP
pm2 save >/dev/null
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

echo "== 8/9 · nginx, HTTPS y tareas programadas"
cat > /etc/nginx/sites-available/ns-network <<NGX
server {
    listen 80;
    server_name $DOMINIO www.$DOMINIO;
    client_max_body_size 10m;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 120s;
    }
}
NGX
ln -sf /etc/nginx/sites-available/ns-network /etc/nginx/sites-enabled/ns-network
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
certbot --nginx -d "$DOMINIO" -d "www.$DOMINIO" --non-interactive --agree-tos -m "$CORREO" --redirect || echo "   (certificado pendiente: ¿apunta ya el DNS a este servidor? Vuelve a lanzar el script cuando apunte)"

CRON_SECRET=$(grep ^CRON_SECRET= $ENV | cut -d= -f2)
cat > /etc/cron.d/ns-network <<CRON
# Ronda de la mañana (Reloj, Compromiso, Rastreo) y drenaje de la Mesa (D-036, D-053)
0 6 * * *   root  curl -s -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/clock >> /var/log/ns-ronda.log 2>&1
*/5 * * * * root  curl -s -H "Authorization: Bearer $CRON_SECRET" http://127.0.0.1:3000/api/jobs  >> /var/log/ns-jobs.log 2>&1
CRON
chmod 644 /etc/cron.d/ns-network

echo "== 9/9 · Copias de seguridad (cifradas, probadas, cada noche)"
bash $DIR/deploy/copias.sh instalar

echo
echo "=============================================================="
echo " Listo. La aplicación responde en https://$DOMINIO"
echo " Usuario de la demo:      $(grep ^DEMO_USER= $ENV | cut -d= -f2)"
echo " Contraseña de la demo:   $(grep ^DEMO_PASSWORD= $ENV | cut -d= -f2)"
echo " Contraseña de los Timoneles ficticios (modo real): $(grep ^NS_SEED_PASSWORD= $ENV | cut -d= -f2)"
echo " Guarda estas claves. Están en $ENV"
echo " Siguiente paso: entra en https://$DOMINIO/acceso y pulsa 'Preparar NS Cumbre (demo)' en Hoy."
echo "=============================================================="
