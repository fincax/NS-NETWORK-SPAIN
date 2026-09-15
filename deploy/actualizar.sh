#!/usr/bin/env bash
# NS Network · actualizar el servidor con lo último de GitHub (rama main).
# Uso: bash /opt/ns-network/deploy/actualizar.sh
set -euo pipefail
DIR=/opt/ns-network
APP=$DIR/apps/web
cd $DIR
git pull --ff-only
pnpm install --frozen-lockfile
cd $APP
set -a; source $APP/.env.production; set +a
pnpm build
pm2 restart ns-network --update-env
pm2 save >/dev/null
# Las copias de seguridad se instalan o actualizan con el código (idempotente): clave, cron y una copia probada.
bash $DIR/deploy/copias.sh instalar
echo "Actualizado a $(git -C $DIR log --oneline -1)"
