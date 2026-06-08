# Sprint 0 — Baseline y seguridad

## Objetivo
Dejar el proyecto en un estado verificable antes de agregar nuevas superficies de Slack.

## Especificación
- Revisar cambios pendientes en `src/prompt/system-prompt.md` antes de implementar features.
- Mantener guardrails: no secretos, no DB, no GitHub API, no App Home, no logging de prompts completos.
- Ajustar tests solo si validan semántica obsoleta y no comportamiento real.

## Criterios de aceptación
- `npm run check` pasa antes de iniciar features.
- No se agregan integraciones fuera de Slack/OpenAI.
- No se guarda estado de usuario.
