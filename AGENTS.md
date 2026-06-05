# AGENTS.md

## Objetivo del proyecto

Este proyecto es un MVP de un bot de Slack llamado **Slack Prompt Coach**.

Su función es ayudar a personas desarrolladoras a mejorar prompts de desarrollo de software antes de usarlos en herramientas como ChatGPT, Codex, Cursor, Copilot, Claude Code u otra herramienta de desarrollo.

El bot **no revisa código**, **no accede a repositorios**, **no analiza PRs** y **no ejecuta cambios**.

---

## Alcance del MVP

El MVP debe hacer únicamente esto:

1. Recibir el comando `/prompt` en Slack.
2. Abrir un modal con preguntas básicas.
3. Tomar la información del usuario.
4. Enviar esa información a OpenAI.
5. Generar un prompt mejorado.
6. Responder al usuario en Slack.

No implementar todavía:

* GitHub API
* Jira
* base de datos
* dashboard
* audio
* RAG
* carga de archivos
* revisión de código
* portal web
* automatizaciones externas

---

## Arquitectura

Usar esta arquitectura:

```text
Slack
  ↓ Socket Mode
Bot Node.js en Hostinger
  ↓ HTTPS
OpenAI API
  ↓
Respuesta a Slack
```

El bot debe usar **Slack Bolt con Socket Mode**.

No crear endpoint público para recibir eventos de Slack.

---

## Tecnologías

Usar:

* Node.js 20+
* JavaScript
* Slack Bolt
* OpenAI SDK
* dotenv
* PM2
* GitHub para versionar el código

Mantener el proyecto simple. No usar TypeScript en el MVP.

---

## Flujo principal

1. El usuario escribe `/prompt`.
2. El bot abre un modal.
3. El usuario completa el formulario.
4. El bot procesa la información.
5. El bot llama a OpenAI.
6. El bot responde con un prompt mejorado.

---

## Campos del modal

El modal debe pedir:

1. **¿Qué querés lograr con la IA?**
2. **¿Qué herramienta vas a usar?**

   * ChatGPT
   * Codex
   * Cursor
   * GitHub Copilot
   * Claude Code
   * Otra
3. **¿Qué tecnología o contexto aplica?**
4. **¿Qué salida esperás?**
5. **¿Qué NO debe hacer la IA?**

---

## Comportamiento esperado

El bot debe generar una respuesta con:

1. Herramienta destino.
2. Prompt mejorado.
3. Máximo 3 elementos de contexto que conviene aclarar antes de usar el prompt.
4. Checklist breve antes de usar el prompt.

El bot nunca debe decir que revisó código, archivos, repositorios o PRs.

---

## Formato de respuesta

Usar este formato:

````markdown
Hola, te preparé una versión mejorada del prompt.

*Herramienta destino:* [herramienta]

*Prompt mejorado:*

```text
[prompt generado]
````

*Contexto que conviene aclarar antes de usarlo:*

1. [contexto faltante 1]
2. [contexto faltante 2]
3. [contexto faltante 3]

*Checklist antes de usarlo:*

* [check 1]
* [check 2]
* [check 3]

````

Si no hay contexto crítico faltante, escribir:

```text
No detecté contexto crítico faltante. El prompt tiene suficiente información para una primera iteración.
````

---

## Estructura sugerida

```text
slack-prompt-coach/
  ├── src/
  │   ├── index.js
  │   ├── slack/
  │   │   ├── commands.js
  │   │   ├── modals.js
  │   │   └── views.js
  │   ├── llm/
  │   │   └── openaiClient.js
  │   ├── prompt/
  │   │   ├── promptCoach.js
  │   │   └── system-prompt.md
  │   └── utils/
  │       ├── env.js
  │       └── logger.js
  ├── .env.example
  ├── .gitignore
  ├── package.json
  ├── ecosystem.config.js
  ├── README.md
  └── AGENTS.md
```

---

## Variables de entorno

Crear `.env.example` con:

```env
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_APP_TOKEN=xapp-your-token
SLACK_SIGNING_SECRET=your-signing-secret
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-5.4-mini
NODE_ENV=development
LOG_LEVEL=info
```

Nunca subir `.env` al repositorio.

---

## GitHub y despliegue en Hostinger

El proyecto debe quedar preparado para subirse a un repositorio privado de GitHub y luego bajarse desde Hostinger.

El flujo esperado es:

```text
Desarrollo local
  ↓ git push
GitHub privado
  ↓ git clone / git pull
Hostinger Linux
  ↓ pm2 restart
Bot actualizado
```

El repositorio debe incluir:

* código fuente
* `README.md`
* `AGENTS.md`
* `.env.example`
* `.gitignore`
* `package.json`
* `ecosystem.config.js`

El repositorio NO debe incluir:

* `.env`
* tokens
* API keys
* `node_modules`
* logs
* archivos temporales

Crear `.gitignore` con:

```gitignore
node_modules/
.env
.env.*
logs/
*.log
.DS_Store
```

El README debe incluir pasos para:

1. Clonar el repo en Hostinger.
2. Crear el archivo `.env`.
3. Instalar dependencias.
4. Ejecutar con PM2.
5. Actualizar con `git pull`.
6. Reiniciar el bot con PM2.

Comandos esperados en Hostinger:

```bash
git clone git@github.com:USUARIO/slack-prompt-coach.git
cd slack-prompt-coach
npm install
nano .env
pm2 start ecosystem.config.js
pm2 save
pm2 logs slack-prompt-coach
```

Para actualizar:

```bash
cd slack-prompt-coach
git pull origin main
npm install
pm2 restart slack-prompt-coach
pm2 logs slack-prompt-coach
```

No implementar GitHub Actions en el MVP, salvo que se solicite después.

---

## Reglas de seguridad

* No guardar secretos.
* No imprimir tokens en logs.
* No guardar prompts completos en el MVP.
* No guardar código fuente enviado por usuarios.
* No conectarse a GitHub API.
* No ejecutar código.
* No afirmar acceso a repositorios.
* Usar Socket Mode.
* Mantener `.env` fuera de GitHub.

---

## PM2

Crear `ecosystem.config.js`:

```js
module.exports = {
  apps: [
    {
      name: "slack-prompt-coach",
      script: "src/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
```

---

## Criterios de aceptación

El MVP está listo cuando:

1. El bot inicia con Socket Mode.
2. El comando `/prompt` funciona.
3. El modal se abre correctamente.
4. El usuario puede enviar el formulario.
5. El bot llama a OpenAI.
6. El bot devuelve un prompt mejorado.
7. La respuesta incluye contexto por aclarar y checklist.
8. El bot corre con PM2 en Hostinger.
9. El código puede subirse a GitHub sin secretos.
10. El código puede bajarse desde Hostinger con `git clone`.
11. Las actualizaciones pueden aplicarse con `git pull` y `pm2 restart`.
12. No se implementó nada fuera del MVP.

---

## Instrucción principal para Codex

No sobreingenierizar.

Construir primero una versión simple, estable y funcional del bot para mejorar prompts desde Slack.

El proyecto debe quedar listo para versionarse en GitHub y desplegarse manualmente en Hostinger.
