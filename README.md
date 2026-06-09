# Slack Prompt Coach

**Slack Prompt Coach** es un bot de Slack para mejorar prompts de desarrollo de software antes de usarlos en ChatGPT, Codex, Cursor, GitHub Copilot, Claude Code u otra herramienta de desarrollo.

El objetivo no es revisar código ni conectarse a repositorios. El bot toma una idea o prompt inicial, lo reestructura con guardrails técnicos y devuelve una versión más clara, accionable y segura.

---

## Qué hace

- Recibe el comando `/prompt` en Slack.
- Abre un modal para elegir herramienta destino y pegar un prompt o idea inicial.
- Envía el pedido a OpenAI usando un system prompt especializado.
- Devuelve en Slack:
  - herramienta destino
  - problemas detectados, máximo 3
  - prompt mejorado
  - contexto por aclarar, máximo 3 puntos
  - checklist breve
  - estrategia aplicada
- Permite refinar el resultado con botones:
  - Más corto
  - Más completo
  - Agregar restricciones
  - Agregar pruebas
  - Criterios de aceptación
- Permite generar variantes:
  - Versión corta
  - Versión completa
  - Versión agentic
  - Adaptar a Codex
  - Adaptar a ChatGPT
  - Adaptar a Cursor
  - Adaptar a Copilot
  - Adaptar a Claude Code
- Permite usar un message shortcut llamado `Mejorar este prompt`.

---

## Qué NO hace

Este MVP/V1 no implementa:

- GitHub API
- Jira
- base de datos
- dashboard
- App Home
- RAG
- carga de archivos
- revisión de código
- análisis de PRs
- ejecución de comandos del usuario
- analytics reales de feedback
- botones `Útil` / `No útil`

El bot no debe afirmar que revisó código, archivos, repositorios, PRs o que ejecutó tests.

---

## Arquitectura

```text
Slack
  ↓ Socket Mode
Bot Node.js con Slack Bolt
  ↓ HTTPS
Azure Foundry Responses API
  ↓
Respuesta Slack con Block Kit + fallback text
```

No hay endpoint público para eventos de Slack. La app usa **Socket Mode**.

### Flujo de comunicación

```mermaid
sequenceDiagram
  participant U as Usuario
  participant S as Slack
  participant B as Bot Node.js
  participant A as Azure Foundry

  B->>S: Abre conexión Socket Mode usando SLACK_APP_TOKEN
  U->>S: Escribe /prompt
  S->>B: Envía command payload por Socket Mode
  B->>S: ack()
  B->>S: client.views.open()
  S->>U: Muestra modal

  U->>S: Envía modal
  S->>B: view_submission por Socket Mode
  B->>S: ack()
  B->>A: Llama Azure Foundry
  A->>B: Devuelve JSON estructurado
  B->>S: client.chat.postEphemeral()
  S->>U: Muestra prompt mejorado
```

Slack no llama un endpoint HTTP público del bot. El bot mantiene una conexión saliente con Slack por Socket Mode y responde usando Slack Web API.

---

## Requisitos

- Node.js 20+
- npm
- Slack App con Socket Mode habilitado
- Slack Bot Token `xoxb-...`
- Slack App-Level Token `xapp-...`
- Slack Signing Secret
- Azure OpenAI / Foundry API Key
- Azure Foundry endpoint `/openai/v1`
- PM2 para correr en Hostinger/Linux

---

## Instalación local

```bash
npm install
cp .env.example .env
nano .env
npm run check
npm start
```

El bot queda corriendo localmente contra Slack si los tokens son válidos y Socket Mode está habilitado.

---

## Variables de entorno

Ejemplo:

```env
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_APP_TOKEN=xapp-your-token
SLACK_SIGNING_SECRET=your-signing-secret
AZURE_OPENAI_API_KEY=your-azure-openai-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.services.ai.azure.com/openai/v1
AZURE_OPENAI_MODEL=gpt-5.2
AZURE_OPENAI_REASONING_EFFORT=high
NODE_ENV=development
LOG_LEVEL=info
```

Notas:

- `.env` no debe subirse al repositorio.
- Si pegás el endpoint completo con `/responses`, la app lo normaliza automáticamente a la base `/openai/v1`.
- Si `AZURE_OPENAI_MODEL` no está disponible en tu recurso, el bot puede iniciar pero fallará al generar prompts.
- Si `AZURE_OPENAI_REASONING_EFFORT` falta o es inválido, la app usa fallback a `high`.

---

## Configuración mínima en Slack

En la Slack App:

1. Habilitar **Socket Mode**.
2. Crear un **App-Level Token** con permisos para Socket Mode.
3. Configurar el slash command:

```text
/prompt
```

4. Habilitar interactividad.
5. Crear message shortcut:

```text
Nombre: Mejorar este prompt
Callback ID: prompt_coach_message_shortcut
```

6. Instalar la app en el workspace.
7. Copiar tokens y signing secret al `.env`.

---

## Scripts

```bash
npm start
```

Inicia el bot.

```bash
npm test
```

Ejecuta tests con `node --test`.

```bash
npm run check
```

Ejecuta tests y chequeo sintáctico de archivos clave.

Usar `npm run check` antes de subir cambios.

---

## Estructura del proyecto

```text
src/
  index.js
  slack/
    commands.js
    modals.js
    promptContextCache.js
    responseBlocks.js
    shortcuts.js
    views.js
  llm/
    azureOpenAIClient.js
  prompt/
    promptCoach.js
    system-prompt.md
  utils/
    env.js
    logger.js

docs/
  arquitectura-y-archivos-js.md
  sprints/

test/
  *.test.js
```

Documentación detallada de archivos JavaScript:

```text
docs/arquitectura-y-archivos-js.md
```

---

## Descripción rápida de archivos principales

- `src/index.js` — arranca la app, crea Slack Bolt, Azure Foundry y registra handlers.
- `src/slack/commands.js` — registra `/prompt` y abre el modal principal.
- `src/slack/modals.js` — construye modales y extrae datos del formulario.
- `src/slack/views.js` — maneja submissions, botones, selects y errores Slack.
- `src/slack/responseBlocks.js` — construye Block Kit y define refinamientos/variantes.
- `src/slack/promptContextCache.js` — cache temporal en memoria solo como fallback para botones cuando Slack no entrega contexto suficiente, TTL 15 minutos.
- `src/slack/shortcuts.js` — registra el shortcut `Mejorar este prompt`.
- `src/prompt/promptCoach.js` — lógica de negocio, parsing, normalización y guardrails.
- `src/prompt/system-prompt.md` — instrucciones principales para el modelo.
- `src/llm/azureOpenAIClient.js` — integración con Azure Foundry Responses API y JSON schema.
- `src/utils/env.js` — validación de variables de entorno.
- `src/utils/logger.js` — logger simple con filtrado de secretos.

---

## Cómo funciona el flujo `/prompt`

```text
Usuario escribe /prompt
  ↓
commands.js hace ack y abre modal
  ↓
modals.js construye el formulario
  ↓
views.js recibe el submit
  ↓
promptCoach.js arma el input
  ↓
azureOpenAIClient.js llama Azure Foundry
  ↓
promptCoach.js normaliza la respuesta
  ↓
responseBlocks.js construye Block Kit
  ↓
views.js responde al usuario en Slack
```

---

## Cómo funcionan los botones

Cuando el bot genera una respuesta, la fuente principal para los botones debe ser el propio mensaje de Slack: primero `message.blocks` y luego `message.text`. Además, `responseBlocks.js` guarda temporalmente el prompt en memoria con `promptContextCache.js` y coloca el ID en el `block_id` de Slack solo como respaldo.

Cuando el usuario presiona un botón:

1. Slack manda la interacción.
2. `views.js` hace `ack()`.
3. El bot intenta recuperar el prompt en este orden:
   - `message.blocks` del payload de Slack
   - `message.text` del payload de Slack
   - cache temporal en memoria, solo si Slack no trae suficiente contexto
4. Manda un mensaje privado indicando que está generando.
5. Llama a OpenAI con una instrucción específica del botón.
6. Devuelve una nueva respuesta.

El cache dura 15 minutos y se pierde si el proceso se reinicia. Es solo un fallback para casos donde Slack no entregue el mensaje/contexto suficiente en la interacción; no es la fuente primaria ni una persistencia real.

---

## Despliegue en Hostinger / Linux con PM2

Primera instalación:

```bash
git clone git@github.com:USUARIO/slack-prompt-coach.git
cd slack-prompt-coach
npm install
cp .env.example .env
nano .env
pm2 start ecosystem.config.js
pm2 save
pm2 logs slack-prompt-coach
```

Actualizar versión:

```bash
cd slack-prompt-coach
git pull origin main
npm install
pm2 restart slack-prompt-coach
pm2 logs slack-prompt-coach
```

Si el repo se clona por HTTPS, usar la URL HTTPS del repositorio en lugar de SSH.

---

## Seguridad

Reglas del proyecto:

- No subir `.env`.
- No subir tokens ni API keys.
- No subir `node_modules/`.
- No subir logs.
- No loggear prompts completos.
- No loggear secretos.
- No guardar prompts completos en DB o archivos.
- No afirmar acceso a repos, archivos, PRs o ejecución.

El `.gitignore` debe proteger archivos locales sensibles como `.env`, logs y `GITAcceso.txt`.

---

## Tests

Ejecutar:

```bash
npm run check
```

Cobertura esperada:

- env
- modales
- extracción de datos Slack
- OpenAI schema
- prompt coach
- Block Kit
- interacciones
- shortcut
- fallback de contexto
- ausencia de feedback buttons
- ausencia de score visible

---

## Estado actual

Último estado validado:

```text
npm run check → 47 tests pasando
```

El bot puede correr localmente con:

```bash
npm start
```

y en producción con:

```bash
pm2 start ecosystem.config.js
```
