# Sprint 1 — Respuesta Slack con Block Kit y feedback liviano

## Objetivo
Convertir la respuesta del coach en una experiencia Slack nativa con bloques y feedback no persistente.

## Especificación
- Renderizar herramienta, score, problemas detectados, prompt, contexto, checklist y estrategia como Block Kit.
- Mantener `text` fallback para accesibilidad y notificaciones.
- Agregar botones 👍 útil / 👎 no útil.
- El feedback solo responde con confirmación privada; no se almacena.

## Criterios de aceptación
- Los bloques respetan límites de texto de Slack.
- El prompt largo se divide en bloques y puede recuperarse desde el mensaje.
- Feedback no llama a OpenAI ni guarda métricas.
