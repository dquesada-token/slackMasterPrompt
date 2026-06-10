# AGENTS.md

## Objetivo del proyecto

Este proyecto es un MVP/V1 de un bot de Slack llamado **Slack Prompt Coach**.

Su función es ayudar a personas desarrolladoras a mejorar prompts de desarrollo de software antes de usarlos en herramientas como ChatGPT, Codex, Cursor, GitHub Copilot, Claude Code u otra herramienta de desarrollo.

El bot **no revisa código**, **no accede a repositorios**, **no analiza PRs**, **no ejecuta comandos del usuario** y **no modifica archivos de proyectos externos**. Solo mejora prompts.

---

## Comportamiento esperado del asistente en este repo

Actuá como copiloto técnico realista, crítico y directo.

Reglas:

1. No des la razón automáticamente.
2. Si una idea tiene problemas, decilo con claridad.
3. Señalá supuestos no validados.
4. Identificá riesgos técnicos, mantenimiento, seguridad, performance, testing y complejidad innecesaria.
5. Si algo es sobreingeniería para este MVP, decilo explícitamente.
6. No implementes cambios grandes sin explicar impacto, riesgos y alternativa simple.
7. Priorizá soluciones simples, mantenibles, testeables e incrementales.
8. No refactorices por gusto.
9. No cambies comportamiento funcional sin justificarlo.
10. Cuando revises código, buscá bugs reales, edge cases y riesgos de compatibilidad.
11. Contestá preferentemente en español.

Formato recomendado para evaluar ideas:

```text
- Veredicto técnico:
- Lo que está bien:
- Lo que no me convence:
- Riesgos:
- Supuestos:
- Alternativa recomendada:
- Siguiente paso concreto:
```

Formato recomendado para revisar código:

```text
- Hallazgos críticos:
- Riesgos medios:
- Mejoras opcionales:
- Pruebas recomendadas:
- Cambios que NO haría todavía:
```

---

## Alcance actual de V1

V1 permite:

1. Recibir el comando `/prompt` en Slack.
2. Abrir un modal con herramienta destino y prompt/idea inicial.
3. Enviar la información a Azure Foundry.
4. Generar un prompt mejorado.
5. Responder en Slack con Block Kit y fallback `text`.
6. Mostrar hasta 3 problemas detectados, sin mostrar score numérico.
7. Mostrar hasta 3 elementos de contexto por aclarar.
8. Mostrar checklist breve.
9. Permitir refinamientos sin DB:
   - Más corto
   - Más completo
   - Agregar restricciones
   - Agregar pruebas
   - Criterios de aceptación
10. Permitir variantes sin DB:
    - Versión corta
    - Versión completa
    - Versión agentic
    - Adaptar a Codex
    - Adaptar a ChatGPT
    - Adaptar a Cursor
    - Adaptar a Copilot
    - Adaptar a Claude Code
11. Permitir message shortcut `Mejorar este prompt`.
12. Usar `message.blocks` / `message.text` de Slack como fuente primaria para contexto de botones y cache temporal en memoria solo como fallback.

V1 no debe implementar:

- GitHub API
- Jira
- base de datos
- dashboard
- audio
- RAG
- carga de archivos
- revisión de código
- portal web
- App Home
- automatizaciones externas
- analytics reales de feedback
- botones `Útil` / `No útil`

---

## Arquitectura

Arquitectura obligatoria:

```text
Slack
  ↓ Socket Mode
Bot Node.js
  ↓ HTTPS
Azure Foundry Responses API
  ↓
Respuesta a Slack
```

Reglas:

- Usar **Slack Bolt con Socket Mode**.
- No crear endpoint público para eventos de Slack.
- No agregar servidor HTTP salvo necesidad explícita y justificada.
- No agregar DB en V1.
- Mantener JavaScript. No migrar a TypeScript en este MVP.

---

## Tecnologías

Usar:

- Node.js 20+
- JavaScript CommonJS
- Slack Bolt
- OpenAI SDK configurado contra Azure Foundry
- dotenv
- PM2
- GitHub para versionar código

No usar por ahora:

- TypeScript
- frameworks HTTP adicionales
- ORMs
- colas
- workers externos
- proveedores de storage

---

## Flujo principal

1. El usuario escribe `/prompt`.
2. Slack envía el command payload al bot por Socket Mode.
3. El bot hace `ack()`.
4. El bot abre el modal principal.
5. El usuario selecciona herramienta y pega su prompt/idea inicial.
6. El bot hace `ack()` del modal.
7. El bot llama a Azure Foundry usando el system prompt del proyecto.
8. El bot normaliza la respuesta JSON.
9. El bot responde al usuario en Slack con Block Kit.
10. Si el usuario presiona refinamiento o variante, el bot genera una nueva versión sin guardar historial permanente.

---

## Campos del modal

El modal principal debe pedir únicamente:

1. **Qué herramienta vas a usar**
   - ChatGPT
   - Codex
   - Cursor
   - GitHub Copilot
   - Claude Code
   - Otra
2. **Pegá tu prompt o idea inicial**

Puede tener ayuda contextual simple, como casos de uso y ejemplos, siempre que no complique el flujo principal.

---

## Formato esperado de respuesta

El bot debe generar una respuesta con:

1. Herramienta destino.
2. Problemas detectados, máximo 3, si existen.
3. Prompt mejorado.
4. Máximo 3 elementos de contexto que conviene aclarar.
5. Checklist breve, máximo 3 elementos.
6. Estrategia aplicada.
7. Acciones de refinamiento y variantes.

No debe mostrar:

- `Calidad del prompt original: N/100`
- botones `Útil` / `No útil`

Si no hay contexto crítico faltante, usar:

```text
No detecté contexto crítico faltante. El prompt tiene suficiente información para una primera iteración.
```

---

## Estructura actual

```text
slack-prompt-coach/
  ├── src/
  │   ├── index.js
  │   ├── slack/
  │   │   ├── commands.js
  │   │   ├── modals.js
  │   │   ├── promptContextCache.js
  │   │   ├── responseBlocks.js
  │   │   ├── shortcuts.js
  │   │   └── views.js
  │   ├── llm/
  │   │   └── azureOpenAIClient.js
  │   ├── prompt/
  │   │   ├── promptCoach.js
  │   │   └── system-prompt.md
  │   └── utils/
  │       ├── env.js
  │       └── logger.js
  ├── docs/
  │   ├── arquitectura-y-archivos-js.md
  │   └── sprints/
  ├── test/
  ├── .env.example
  ├── .gitignore
  ├── appscript/
  │   ├── logs.sh
  │   ├── start.sh
  │   ├── stop.sh
  │   └── updateApp.sh
  ├── package.json
  ├── package-lock.json
  ├── ecosystem.config.js
  ├── README.md
  └── AGENTS.md
```

Ver explicación de archivos en:

```text
docs/arquitectura-y-archivos-js.md
```

---

## Variables de entorno

`.env.example` debe incluir:

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

Nunca subir `.env` al repositorio.

---

## Reglas de seguridad

- No guardar secretos.
- No imprimir tokens en logs.
- No guardar prompts completos de forma persistente en V1.
- No guardar código fuente enviado por usuarios.
- No conectarse a GitHub API.
- No ejecutar código del usuario.
- No afirmar acceso a repositorios, archivos, PRs o ejecución.
- Usar Socket Mode.
- Mantener `.env` fuera de GitHub.
- Mantener `GITAcceso.txt`, logs y temporales fuera de GitHub.
- Los logs no deben incluir prompts completos.

---

## Slack: IDs importantes

No cambiar estos IDs sin actualizar configuración de Slack y tests:

- Slash command: `/prompt`
- Message shortcut callback ID: `prompt_coach_message_shortcut`
- Modal callback ID: `prompt_coach_submission`
- Variante select action ID: `prompt_variant_select`

Los action IDs de refinamiento viven en `src/slack/responseBlocks.js`.

---

## Azure Foundry

La app usa Azure Foundry Responses API con JSON schema estricto.

Campos esperados:

```js
{
  improvedPrompt: string,
  questions: string[],
  checklist: string[],
  strategy: string,
  qualityScore: number,
  detectedIssues: string[],
  recommendedActions: string[]
}
```

`qualityScore` existe internamente, pero no debe mostrarse como score visible en Slack.

---

## PM2 y despliegue

El proyecto debe poder desplegarse manualmente en Hostinger o Linux:

```bash
npm install
pm2 start ecosystem.config.js
pm2 save
pm2 logs slack-prompt-coach
```

Para actualizar:

```bash
git pull origin main
npm install
pm2 restart slack-prompt-coach
pm2 logs slack-prompt-coach
```

No implementar GitHub Actions en el MVP salvo pedido explícito.

---

## Tests y validación

Antes de considerar un cambio terminado, ejecutar:

```bash
npm run check
```

Ese comando debe pasar.

Tests mínimos esperados para cambios funcionales:

- construcción de modales o bloques Slack
- registro de handlers `app.command`, `app.view`, `app.action`, `app.shortcut`
- extracción segura de datos desde Slack
- fallback cuando falta contexto
- no logging de secretos ni prompts completos
- schema Azure Foundry cuando cambia la salida del modelo

---

## Criterios de aceptación actuales

El proyecto está sano cuando:

1. El bot inicia con Socket Mode.
2. `/prompt` abre el modal.
3. El usuario puede enviar herramienta y prompt inicial.
4. El bot llama a Azure Foundry.
5. El bot devuelve prompt mejorado en Slack.
6. La respuesta incluye contexto por aclarar y checklist.
7. Los refinamientos funcionan sin DB.
8. Las variantes funcionan sin DB.
9. El shortcut de mensaje abre el modal prellenado.
10. `npm run check` pasa.
11. El código puede subirse a GitHub sin secretos.
12. El bot puede correr con PM2 en Hostinger.
13. Los scripts de `appscript/` permiten arrancar, apagar, actualizar y ver logs de la app directamente dentro del servidor Linux.

---

## Instrucción principal para Codex

No sobreingenierizar.

Este proyecto debe seguir siendo una versión simple, estable y funcional de un bot para mejorar prompts desde Slack.
