# Sprint 3 — Variantes de prompt

## Objetivo
Generar variantes de longitud, estilo agentic y herramienta destino desde el mismo mensaje.

## Especificación
- Usar un `static_select` para evitar saturar el mensaje con botones.
- Opciones: corta, completa, agentic, Codex, ChatGPT, Cursor, Copilot y Claude Code.
- La acción extrae el prompt actual desde Slack y llama a OpenAI con una instrucción de variante.

## Criterios de aceptación
- El selector hace `ack()` y llama a `coach.variant()`.
- Si falta contexto recuperable, responde error privado.
- No se agrega persistencia ni App Home.
