# Sprint 5 — Prompt linter con score

## Objetivo
Mostrar una evaluación breve del prompt original sin convertir el bot en dashboard ni almacenar datos.

## Especificación
- Extender el JSON del modelo con `qualityScore`, `detectedIssues` y `recommendedActions`.
- Usar una rúbrica simple: claridad, restricciones, criterios de aceptación, herramienta destino y seguridad.
- Mostrar score y hasta 3 problemas en Slack.
- Mantener máximo 3 acciones recomendadas como metadata textual/estructurada.

## Criterios de aceptación
- El schema de OpenAI exige los nuevos campos.
- El parser limita problemas y acciones a 3 elementos.
- La salida Slack muestra score y problemas sin guardar métricas.
