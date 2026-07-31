#!/usr/bin/env bash
set -euo pipefail

# Corre en el servidor de producción (invocado por .github/workflows/deploy.yml vía
# SSH, o a mano si hace falta). Asume que este script vive dentro del repo ya
# clonado, y que ~/heliteb-backups/ existe fuera del working tree del repo (creado
# en el bootstrap manual), para que nunca interfiera con git pull.

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUPS_DIR="${HELITEB_BACKUPS_DIR:-$HOME/heliteb-backups}"

cd "$REPO_DIR"
mkdir -p "$BACKUPS_DIR"

echo "==> Guardando el commit actual por si hay que hacer rollback"
git rev-parse HEAD > "$BACKUPS_DIR/last-good.txt"

echo "==> Respaldando Postgres antes de reconstruir"
timestamp="$(date +%Y%m%d-%H%M%S)"
docker compose exec -T postgres pg_dump -U heliteb_user heliteb | gzip > "$BACKUPS_DIR/pre-deploy-$timestamp.sql.gz"
find "$BACKUPS_DIR" -name '*.sql.gz' -mtime +14 -delete

echo "==> Actualizando código"
git pull

echo "==> Reconstruyendo y levantando contenedores"
docker compose up -d --build --remove-orphans

# .env define PANEL_DOMAIN/API_DOMAIN reales; se usan solo para las verificaciones.
set -a
source .env
set +a

# "docker compose up -d" vuelve en cuanto el contenedor arranca, no cuando la
# app adentro ya está escuchando (el API .NET tarda unos segundos en levantar)
# - sin reintentos, esto revienta con un 502 fantasma aunque el despliegue haya
# salido bien. Da hasta ~30s de margen antes de declarar fallo real.
wait_for() {
  local url="$1" expected="$2" label="$3" status="000"
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    status="$(curl -s -o /dev/null -w '%{http_code}' "$url" || echo "000")"
    [ "$status" = "$expected" ] && { echo "$status"; return 0; }
    sleep 3
  done
  echo "ERROR: $label respondió $status (se esperaba $expected) tras varios reintentos" >&2
  echo "$status"
  return 1
}

echo "==> Verificando API (401 sin token = está arriba y exigiendo auth, por diseño)"
api_status="$(wait_for "https://${API_DOMAIN}/api/health" "401" "https://${API_DOMAIN}/api/health")" || exit 1

echo "==> Verificando panel"
panel_status="000"
for _ in 1 2 3 4 5 6 7 8 9 10; do
  panel_status="$(curl -s -o /dev/null -w '%{http_code}' "https://${PANEL_DOMAIN}/login" || echo "000")"
  { [ "$panel_status" = "200" ] || [ "$panel_status" = "301" ]; } && break
  sleep 3
done
if [ "$panel_status" != "200" ] && [ "$panel_status" != "301" ]; then
  echo "ERROR: https://${PANEL_DOMAIN}/login respondió $panel_status (se esperaba 200 o 301) tras varios reintentos"
  exit 1
fi

echo "==> Despliegue OK (API: $api_status, panel: $panel_status)"
