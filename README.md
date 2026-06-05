# Slack Prompt Coach

MVP de bot de Slack para mejorar prompts de desarrollo de software antes de usarlos en ChatGPT, Codex, Cursor, GitHub Copilot, Claude Code u otra herramienta de desarrollo.

## Alcance del MVP

- Recibe `/prompt` en Slack.
- Abre un modal con preguntas básicas.
- Envía el contexto a OpenAI.
- Responde en Slack con un prompt mejorado, hasta 3 elementos de contexto por aclarar y un checklist breve.
- Usa Slack Bolt con Socket Mode; no expone endpoint público.

Fuera de alcance por ahora: GitHub API, Jira, base de datos, dashboard, audio, RAG, carga de archivos, revisión de código, portal web, automatizaciones e integraciones fuera del flujo Slack → OpenAI.

## Requisitos

- Node.js 20+
- Una app de Slack con Socket Mode habilitado
- Tokens de Slack: bot token (`xoxb-...`) y app-level token (`xapp-...`)
- OpenAI API key
- PM2 en Hostinger o en el servidor Linux

## Variables de entorno

Copiá el ejemplo y completá valores reales en el servidor:

```bash
cp .env.example .env
nano .env
```

Variables esperadas:

```env
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_APP_TOKEN=xapp-your-token
SLACK_SIGNING_SECRET=your-signing-secret
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-5.4-mini
NODE_ENV=development
LOG_LEVEL=info
```

Nunca subás `.env`, tokens ni API keys al repositorio.

## Desarrollo local

```bash
npm install
npm test
npm start
```

## Instalación en Hostinger

```bash
git clone git@github.com:dquesada-token/slackMasterPrompt.git
cd slackMasterPrompt
npm install
cp .env.example .env
nano .env
pm2 start ecosystem.config.js
pm2 save
pm2 logs slack-prompt-coach
```

Si el repo se clona por HTTPS, usá la URL HTTPS del repositorio en lugar de la URL SSH.

## Actualizar en Hostinger

```bash
cd slackMasterPrompt
git pull origin main
npm install
pm2 restart slack-prompt-coach
pm2 logs slack-prompt-coach
```

## Configuración mínima de Slack

1. Crear una Slack app.
2. Habilitar Socket Mode.
3. Crear un App-Level Token con alcance para Socket Mode.
4. Crear el slash command `/prompt`.
5. Habilitar interactividad para que el modal envíe `view_submission` al bot vía Socket Mode.
6. Instalar la app en el workspace y copiar los tokens al `.env`.

## Scripts

- `npm test` — ejecuta pruebas con `node --test`.
- `npm run check` — ejecuta pruebas y chequeo de sintaxis.
- `npm start` — inicia el bot.

## Seguridad

- No se guardan prompts ni respuestas.
- No se imprimen tokens en logs.
- No se revisan repositorios, código ni PRs.
- No se usa GitHub API.
- `.env`, `GITAcceso.txt`, `node_modules`, logs y temporales están excluidos por `.gitignore`.
