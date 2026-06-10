#!/usr/bin/env bash
set -euo pipefail

# Ir al directorio donde está desplegada la app.
cd /home/ubuntu/slack-prompt-coach

# Traer la última versión del repositorio.
git pull origin main

# Instalar o actualizar dependencias del proyecto.
npm install

# Reiniciar la app con las variables actuales y guardar el estado de PM2.
pm2 restart slack-prompt-coach --update-env
pm2 save

# Mostrar el estado final de la app.
pm2 status --no-color
