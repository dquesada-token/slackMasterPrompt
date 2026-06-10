#!/usr/bin/env bash
set -euo pipefail

# Detener la app en PM2 y mostrar el estado final.
pm2 stop slack-prompt-coach
pm2 status --no-color
