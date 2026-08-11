#!/usr/bin/env bash
set -euo pipefail

# Corre en el servidor de producción (invocado por .github/workflows/deploy.yml vía
# SSH, o a mano si hace falta). Asume que este script vive dentro del repo ya
# clonado, y que ~/heliteb-backups/ existe fuera del working tree del repo (creado
# en el bootstrap manual), para que nunca interfiera con git pull.

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# HOME puede no existir: systemd no lo define, y con `set -u` eso mataba el
# script en esta línea ("HOME: unbound variable") cuando lo invoca el timer del
# autodespliegue. Por SSH nunca se vio porque el shell de login sí lo define.
# El respaldo debe quedar FUERA del working tree para no estorbarle a git pull,
# así que el sustituto natural es el directorio padre del repo.
BACKUPS_DIR="${HELITEB_BACKUPS_DIR:-${HOME:-$(dirname "$REPO_DIR")}/heliteb-backups}"

cd "$REPO_DIR"
mkdir -p "$BACKUPS_DIR"

# El candado de concurrencia del workflow de GitHub Actions solo serializa
# corridas automáticas entre sí - una corrida manual (por SSH, para probar un
# fix rápido) puede seguir chocando con una automática que arranca al mismo
# tiempo, y ya pasó dos veces: Docker se confunde con el nombre temporal que
# usa al recrear un contenedor. flock aquí serializa CUALQUIER combinación de
# corridas en esta máquina, vengan de donde vengan - la segunda simplemente
# espera a que la primera termine, en vez de pisarla.
exec 9>"$BACKUPS_DIR/deploy.lock"
if ! flock -w 300 9; then
  echo "ERROR: no se pudo obtener el candado de despliegue en 300s (¿otra corrida colgada?)"
  exit 1
fi

echo "==> Guardando el commit actual por si hay que hacer rollback"
prev_sha="$(git rev-parse HEAD)"
echo "$prev_sha" > "$BACKUPS_DIR/last-good.txt"

echo "==> Respaldando Postgres antes de reconstruir"
timestamp="$(date +%Y%m%d-%H%M%S)"
docker compose exec -T postgres pg_dump -U heliteb_user heliteb | gzip > "$BACKUPS_DIR/pre-deploy-$timestamp.sql.gz"
find "$BACKUPS_DIR" -name '*.sql.gz' -mtime +14 -delete

echo "==> Actualizando código"
git pull

# Reconstruye solo lo que cambió, en vez de recrear siempre los dos
# contenedores de aplicación - un cambio en el panel no debería reiniciar el
# API (y viceversa). docker-compose.yml cuenta como "cambió todo": puede
# afectar cualquier servicio (env vars, puertos, etc.), así que ante la duda
# reconstruye ambos. Sin diff disponible (primera corrida, o el pull no trajo
# nada nuevo por una re-corrida manual), también reconstruye ambos por
# seguridad - nunca se queda a medias.
changed="$(git diff --name-only "$prev_sha" HEAD 2>/dev/null || true)"
build_api=false
build_panel=false
if [ -z "$changed" ]; then
  build_api=true
  build_panel=true
else
  echo "$changed" | grep -qE '^(backend-dotnet/|docker-compose\.yml$)' && build_api=true
  echo "$changed" | grep -qE '^(Front/|docker-compose\.yml$)' && build_panel=true
fi

services=""
[ "$build_api" = true ] && services="$services heliteb-api"
[ "$build_panel" = true ] && services="$services heliteb-panel"

if [ -z "$services" ]; then
  echo "==> Nada que reconstruir (ningún cambio afecta a la API o al panel)"
else
  echo "==> Reconstruyendo:$services"
  # shellcheck disable=SC2086
  docker compose up -d --build --remove-orphans $services
fi

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

# Cada rebuild deja capas de caché de BuildKit y, si cambió el Dockerfile o el
# código, la imagen anterior sin tag (dangling) - sin esto se acumulan varios
# GB por despliegue con el tiempo. Nunca toca volúmenes ni imágenes en uso.
echo "==> Limpiando caché de build e imágenes sin usar"
docker builder prune -af >/dev/null
docker image prune -f >/dev/null
echo "==> Limpieza OK"
