# Sprint 2 — Botones de refinamiento

## Objetivo
Permitir refinamientos comunes sin pedir al usuario copiar y pegar de nuevo.

## Especificación
- Agregar acciones: más corto, más completo, agregar restricciones, agregar pruebas y criterios de aceptación.
- Cada acción extrae el prompt actual desde los bloques Slack y llama nuevamente a OpenAI.
- No usar base de datos ni almacenar el prompt completo.
- Si el mensaje no contiene contexto recuperable, responder con error privado claro.

## Criterios de aceptación
- Cada acción hace `ack()` y llama a `coach.refine()` con herramienta, prompt actual e instrucción de refinamiento.
- Los errores no imprimen prompts en logs.
- La respuesta refinada vuelve como Block Kit con fallback text.
