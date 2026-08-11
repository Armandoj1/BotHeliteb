#!/usr/bin/env bash
set -euo pipefail

# Despliegue "por jalón": el servidor revisa si hay commits nuevos en origin/main
# y, si los hay, corre deploy.sh. Lo dispara heliteb-autodeploy.timer.
#
# POR QUÉ EXISTE, si ya hay un workflow de GitHub Actions:
# porque ese workflow entra por SSH desde los runners de GitHub, y esa conexión
# falla de forma intermitente con "dial tcp ...:22: i/o timeout". Cuando pasa, no
# llega ni un paquete al servidor: sshd no registra el intento, fail2ban no tiene
# baneos, ufw permite el 22 y las sesiones SSH desde otras redes funcionan al
# mismo tiempo. El corte está en la red entre GitHub y Hostinger, fuera de
# nuestro alcance — y ya dejó un commit sin desplegar incluso con reintento.
#
# Esto le da la vuelta: la conexión la abre el servidor (HTTPS saliente a GitHub),
# que es justo lo que sí funciona siempre. El workflow se queda como vía rápida;
# esto es la red de seguridad que garantiza que ningún commit se quede atrás.
#
# deploy.sh toma un flock, así que si una corrida de Actions entra al mismo
# tiempo, la segunda espera en vez de pisar a la primera.

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

git fetch -q origin main

local_sha="$(git rev-parse HEAD)"
remote_sha="$(git rev-parse origin/main)"

if [ "$local_sha" = "$remote_sha" ]; then
  # Silencio deliberado: esto corre cada pocos minutos y el 99% de las veces no
  # hay nada que hacer. Sin esto, el journal se llena de ruido y los despliegues
  # de verdad se pierden entre miles de líneas iguales.
  exit 0
fi

echo "==> Hay commits nuevos en origin/main"
echo "    desplegado: $(git log --oneline -1 --format='%h %s' "$local_sha")"
echo "    nuevo:      $(git log --oneline -1 --format='%h %s' "$remote_sha")"

bash scripts/deploy.sh
