#!/usr/bin/env bash
set -euo pipefail

# Ir al directorio donde está desplegada la app.
cd /home/ubuntu/slack-prompt-coach

# Si la app ya existe en PM2, reiniciarla con el entorno actual.
# Si no existe, arrancarla por primera vez usando ecosystem.config.js.
if pm2 describe slack-prompt-coach >/dev/null 2>&1; then
  pm2 restart slack-prompt-coach --update-env
else
  pm2 start ecosystem.config.js --update-env
fi

# Guardar el estado actual de PM2 y mostrar el estado final.
pm2 save
pm2 status --no-color
