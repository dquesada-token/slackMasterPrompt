# Sprint 4 — Message shortcut “Mejorar este prompt”

## Objetivo
Permitir mejorar un mensaje existente de Slack sin copiarlo manualmente.

## Especificación
- Registrar el message shortcut `prompt_coach_message_shortcut`.
- Abrir un modal mínimo con herramienta destino y prompt inicial prellenado desde el mensaje.
- Truncar el texto inicial a 3000 caracteres para respetar límites del input de Slack.
- Reutilizar el flujo de generación existente.

## Criterios de aceptación
- El shortcut hace `ack()` y abre el modal.
- El modal de shortcut no muestra guía ni ejemplos.
- El texto del mensaje queda prellenado y truncado de forma segura.
