const { savePromptContext } = require('./promptContextCache');

const PROMPT_BODY_BLOCK_PREFIX = 'prompt_result_body_';
const PROMPT_TOOL_BLOCK_ID = 'prompt_result_tool';
const MAX_SECTION_TEXT_LENGTH = 3000;
const PROMPT_CHUNK_TEXT_LIMIT = 2800;

const REFINEMENT_ACTION_IDS = {
  shorter: 'prompt_refine_shorter',
  fuller: 'prompt_refine_fuller',
  addConstraints: 'prompt_refine_add_constraints',
  addTests: 'prompt_refine_add_tests',
  addAcceptanceCriteria: 'prompt_refine_add_acceptance_criteria',
};

const REFINEMENT_REQUESTS = {
  [REFINEMENT_ACTION_IDS.shorter]: [
    'Tipo: shorter',
    'Objetivo: reducir la longitud del prompt sin perder control técnico.',
    'Debe:',
    '- conservar objetivo, herramienta destino, restricciones críticas, criterios de aceptación y stop conditions importantes.',
    '- eliminar redundancia, teoría innecesaria, frases decorativas y pasos que no aportan.',
    '- dejar una versión lista para copiar y pegar.',
    'No debe:',
    '- cambiar la herramienta destino.',
    '- eliminar restricciones de seguridad.',
    '- inventar contexto nuevo.',
  ].join('\n'),
  [REFINEMENT_ACTION_IDS.fuller]: [
    'Tipo: fuller',
    'Objetivo: hacer el prompt más completo y accionable.',
    'Debe:',
    '- agregar contexto, alcance, restricciones, formato de salida y definición de terminado cuando falten.',
    '- explicitar supuestos y límites de autonomía si la herramienta puede modificar código.',
    '- mantener una estructura clara sin volverlo verboso por gusto.',
    'No debe:',
    '- agregar funcionalidades fuera del pedido original.',
    '- cambiar el objetivo central del prompt.',
    '- inventar archivos, repositorios o acceso a código.',
  ].join('\n'),
  [REFINEMENT_ACTION_IDS.addConstraints]: [
    'Tipo: add_constraints',
    'Objetivo: agregar límites de alcance y restricciones explícitas.',
    'Debe:',
    '- incluir acciones permitidas y acciones prohibidas.',
    '- proteger contratos públicos, secretos, dependencias y cambios destructivos.',
    '- agregar stop conditions si la tarea es agentic o riesgosa.',
    'No debe:',
    '- bloquear innecesariamente tareas seguras.',
    '- agregar restricciones contradictorias.',
    '- sugerir que el bot revisó repositorios, archivos o PRs.',
  ].join('\n'),
  [REFINEMENT_ACTION_IDS.addTests]: [
    'Tipo: add_tests',
    'Objetivo: agregar instrucciones de pruebas y validación.',
    'Debe:',
    '- pedir tests adecuados al stack o herramienta mencionada.',
    '- incluir casos borde, regresiones y comandos de verificación solo si hay contexto suficiente.',
    '- pedir que se detenga o marque contexto faltante si no se conoce el framework de tests.',
    'No debe:',
    '- afirmar que ejecutó tests.',
    '- inventar framework de testing sin pistas.',
    '- cambiar lógica productiva solo para hacer pasar tests.',
  ].join('\n'),
  [REFINEMENT_ACTION_IDS.addAcceptanceCriteria]: [
    'Tipo: add_acceptance_criteria',
    'Objetivo: agregar criterios de aceptación y definición de terminado verificables.',
    'Debe:',
    '- convertir el objetivo en checks observables.',
    '- incluir condiciones de éxito, no regresión y límites de alcance.',
    '- mantener máximo lo necesario para guiar implementación o revisión.',
    'No debe:',
    '- agregar criterios imposibles de verificar.',
    '- cambiar el comportamiento esperado sin justificarlo.',
    '- pedir aprobación genérica sin indicar qué validar.',
  ].join('\n'),
};

const PROMPT_VARIANT_ACTION_ID = 'prompt_variant_select';

const VARIANT_REQUESTS = {
  variant_short: [
    'Tipo: variant_short',
    'Objetivo: generar una versión corta y directa del prompt.',
    'Debe:',
    '- preservar objetivo, restricciones críticas y salida esperada.',
    '- usar lenguaje compacto, sin explicación teórica.',
    '- dejarlo listo para copiar y pegar.',
    'No debe:',
    '- eliminar guardrails de seguridad.',
    '- convertirlo en checklist solamente.',
    '- inventar contexto no provisto.',
  ].join('\n'),
  variant_full: [
    'Tipo: variant_full',
    'Objetivo: generar una versión completa del prompt.',
    'Debe:',
    '- incluir contexto, tarea, alcance, restricciones, proceso, salida esperada y criterios de aceptación.',
    '- mantener claridad y estructura por secciones.',
    '- agregar preguntas de contexto solo si son críticas.',
    'No debe:',
    '- sobreingenierizar el pedido.',
    '- agregar integraciones o capacidades no solicitadas.',
    '- afirmar acceso a archivos, repositorios o ejecución.',
  ].join('\n'),
  variant_agentic: [
    'Tipo: variant_agentic',
    'Objetivo: adaptar el prompt para una herramienta agentic.',
    'Debe:',
    '- incluir acciones permitidas, acciones prohibidas, checkpoints y stop conditions.',
    '- pedir cambios incrementales y verificación antes de afirmar completitud.',
    '- marcar cuándo debe detenerse por falta de contexto o riesgo.',
    'No debe:',
    '- autorizar cambios destructivos sin confirmación.',
    '- permitir instalación de dependencias sin justificación.',
    '- sugerir que ya revisó o ejecutó algo.',
  ].join('\n'),
  variant_codex: [
    'Tipo: variant_codex',
    'Objetivo: adaptar el prompt para Codex.',
    'Debe:',
    '- incluir objetivo, alcance, archivos esperados si el usuario los dio, pruebas, checkpoints y stop conditions.',
    '- pedir inspección del flujo antes de cambios cuando aplique.',
    '- pedir resumen final de cambios y verificaciones.',
    'No debe:',
    '- asumir acceso a repo si el usuario no lo proporcionó.',
    '- pedir refactors amplios sin necesidad.',
    '- cambiar comportamiento público sin justificación.',
  ].join('\n'),
  variant_chatgpt: [
    'Tipo: variant_chatgpt',
    'Objetivo: adaptar el prompt para ChatGPT.',
    'Debe:',
    '- enfocar análisis, diseño, explicación, debugging o planificación.',
    '- pedir supuestos explícitos y pasos verificables.',
    '- solicitar una respuesta estructurada y accionable.',
    'No debe:',
    '- pedir que edite archivos directamente.',
    '- afirmar acceso a código o ejecución.',
    '- pedir cadena de pensamiento oculta.',
  ].join('\n'),
  variant_cursor: [
    'Tipo: variant_cursor',
    'Objetivo: adaptar el prompt para Cursor.',
    'Debe:',
    '- indicar file scope si existe, comportamiento actual, comportamiento deseado y restricciones.',
    '- pedir cambios pequeños y revisables.',
    '- incluir do-not-touch y definición de terminado.',
    'No debe:',
    '- abrir el alcance a todo el proyecto.',
    '- pedir cambios masivos sin plan.',
    '- omitir pruebas o validaciones cuando apliquen.',
  ].join('\n'),
  variant_copilot: [
    'Tipo: variant_copilot',
    'Objetivo: adaptar el prompt para GitHub Copilot.',
    'Debe:',
    '- convertirlo en un contrato breve de función, bloque o comentario.',
    '- incluir entradas, salidas, edge cases y comportamiento esperado.',
    '- usar instrucciones concisas aptas para autocompletado.',
    'No debe:',
    '- usar instrucciones largas tipo agente.',
    '- pedir análisis amplio del repositorio.',
    '- depender de contexto que no esté cerca del cursor.',
  ].join('\n'),
  variant_claude_code: [
    'Tipo: variant_claude_code',
    'Objetivo: adaptar el prompt para Claude Code.',
    'Debe:',
    '- incluir objetivo, plan incremental, límites de autonomía, pruebas, checkpoints y stop conditions.',
    '- pedir que entienda el flujo antes de tocar código sensible.',
    '- pedir verificación y resumen final.',
    'No debe:',
    '- aprobar cambios destructivos automáticamente.',
    '- instalar dependencias sin justificarlo.',
    '- afirmar acceso o ejecución previa.',
  ].join('\n'),
};

function plainText(text) {
  return { type: 'plain_text', text, emoji: true };
}

function markdownText(text) {
  return { type: 'mrkdwn', text };
}

function normalizeText(value) {
  return String(value || '').trim();
}

function limitList(values, maxItems) {
  if (!Array.isArray(values)) return [];
  return values.map(normalizeText).filter(Boolean).slice(0, maxItems);
}

function splitPrompt(prompt) {
  const cleanPrompt = normalizeText(prompt) || 'Necesito más contexto para generar un prompt útil.';
  const chunks = [];
  for (let index = 0; index < cleanPrompt.length; index += PROMPT_CHUNK_TEXT_LIMIT) {
    chunks.push(cleanPrompt.slice(index, index + PROMPT_CHUNK_TEXT_LIMIT));
  }
  return chunks.length > 0 ? chunks : [''];
}

function codeBlock(text) {
  const content = String(text || '');
  const blockText = `\`\`\`text\n${content}\n\`\`\``;
  if (blockText.length <= MAX_SECTION_TEXT_LENGTH) return blockText;
  return `\`\`\`text\n${content.slice(0, PROMPT_CHUNK_TEXT_LIMIT)}\n\`\`\``;
}

function numberedList(items, fallbackText) {
  const visibleItems = limitList(items, 3);
  if (visibleItems.length === 0) return fallbackText;
  return visibleItems.map((item, index) => `${index + 1}. ${item}`).join('\n');
}

function bulletList(items, fallbackText) {
  const visibleItems = limitList(items, 3);
  if (visibleItems.length === 0) return fallbackText;
  return visibleItems.map((item) => `• ${item}`).join('\n');
}

function button(text, actionId, value) {
  return {
    type: 'button',
    action_id: actionId,
    text: plainText(text),
    value: value || actionId,
  };
}

function buildPromptResponseBlocks(response) {
  const tool = normalizeText(response.tool) || 'No especificada';
  const strategy = normalizeText(response.strategy) || 'Prompt técnico estructurado con guardrails de alcance y calidad';
  const promptContextId = savePromptContext({ tool, currentPrompt: response.improvedPrompt });
  const refinementBlockId = promptContextId ? `prompt_refinement_actions:${promptContextId}` : 'prompt_refinement_actions';
  const variantBlockId = promptContextId ? `prompt_variant_actions:${promptContextId}` : 'prompt_variant_actions';

  const blocks = [
    {
      type: 'section',
      text: markdownText('*✅ Prompt mejorado*'),
    },
    {
      type: 'section',
      block_id: PROMPT_TOOL_BLOCK_ID,
      text: markdownText(`*Herramienta destino:* ${tool}`),
    },
  ];

  const detectedIssues = limitList(response.detectedIssues, 3);
  if (detectedIssues.length > 0) {
    blocks.push({
      type: 'section',
      text: markdownText([
        detectedIssues.length > 0 ? `*Problemas detectados:*\n${numberedList(detectedIssues)}` : null,
      ].filter(Boolean).join('\n')),
    });
  }

  blocks.push({
    type: 'section',
    text: markdownText('*Prompt mejorado:*'),
  });

  splitPrompt(response.improvedPrompt).forEach((chunk, index) => {
    blocks.push({
      type: 'section',
      block_id: `${PROMPT_BODY_BLOCK_PREFIX}${index}`,
      text: markdownText(codeBlock(chunk)),
    });
  });

  blocks.push(
    {
      type: 'section',
      text: markdownText(`*Contexto que conviene aclarar antes de usarlo:*\n${numberedList(
        response.questions,
        'No detecté contexto crítico faltante. El prompt tiene suficiente información para una primera iteración.'
      )}`),
    },
    {
      type: 'section',
      text: markdownText(`*Checklist antes de usarlo:*\n${bulletList(
        response.checklist,
        '• Validá que el prompt tenga objetivo, contexto y restricciones'
      )}`),
    },
    {
      type: 'context',
      elements: [markdownText(`*Estrategia aplicada:* ${strategy}`)],
    },
    {
      type: 'actions',
      block_id: refinementBlockId,
      elements: [
        button('Más corto', REFINEMENT_ACTION_IDS.shorter),
        button('Más completo', REFINEMENT_ACTION_IDS.fuller),
        button('Agregar restricciones', REFINEMENT_ACTION_IDS.addConstraints),
        button('Agregar pruebas', REFINEMENT_ACTION_IDS.addTests),
        button('Criterios de aceptación', REFINEMENT_ACTION_IDS.addAcceptanceCriteria),
      ],
    },
    {
      type: 'actions',
      block_id: variantBlockId,
      elements: [
        {
          type: 'static_select',
          action_id: PROMPT_VARIANT_ACTION_ID,
          placeholder: plainText('Elegí una variante'),
          options: [
            ['Versión corta', 'variant_short'],
            ['Versión completa', 'variant_full'],
            ['Versión agentic', 'variant_agentic'],
            ['Adaptar a Codex', 'variant_codex'],
            ['Adaptar a ChatGPT', 'variant_chatgpt'],
            ['Adaptar a Cursor', 'variant_cursor'],
            ['Adaptar a Copilot', 'variant_copilot'],
            ['Adaptar a Claude Code', 'variant_claude_code'],
          ].map(([label, value]) => ({ text: plainText(label), value })),
        },
      ],
    }
  );

  return blocks;
}

function stripCodeBlock(text) {
  let value = String(text || '').trim();
  value = value.replace(/^```(?:text)?\n?/i, '');
  value = value.replace(/\n?```$/i, '');
  return value;
}

function extractToolFromBlock(block) {
  const text = block?.text?.text || '';
  const match = text.match(/\*Herramienta destino:\*\s*(.+)$/i);
  return match ? normalizeText(match[1]) : '';
}

function extractToolFromText(text) {
  const match = String(text || '').match(/\*Herramienta destino:\*\s*([^\n]+)/i);
  return match ? normalizeText(match[1]) : '';
}

function extractPromptFromText(text) {
  const value = String(text || '');
  const promptSection = value.match(/\*Prompt mejorado:\*\s*```(?:text)?\n([\s\S]*?)\n```/i);
  if (promptSection) return normalizeText(promptSection[1]);

  const looseSection = value.match(/\*Prompt mejorado:\*\s*([\s\S]*?)(?:\n\s*\*Contexto que conviene aclarar antes de usarlo:\*|\n\s*\*Checklist antes de usarlo:\*|$)/i);
  return looseSection ? normalizeText(looseSection[1]) : '';
}

function promptBlockIndex(block) {
  const value = String(block.block_id || '').slice(PROMPT_BODY_BLOCK_PREFIX.length);
  const index = Number(value);
  return Number.isFinite(index) ? index : 0;
}

function extractPromptContextFromMessage(message) {
  const blocks = Array.isArray(message?.blocks) ? message.blocks : [];
  const promptChunks = blocks
    .filter((block) => String(block.block_id || '').startsWith(PROMPT_BODY_BLOCK_PREFIX))
    .sort((a, b) => promptBlockIndex(a) - promptBlockIndex(b))
    .map((block) => stripCodeBlock(block.text?.text))
    .filter(Boolean);
  const toolBlock = blocks.find((block) => block.block_id === PROMPT_TOOL_BLOCK_ID);
  const blockPrompt = normalizeText(promptChunks.join(''));
  const textPrompt = blockPrompt ? '' : extractPromptFromText(message?.text);
  const blockTool = extractToolFromBlock(toolBlock);

  return {
    tool: blockTool || extractToolFromText(message?.text),
    currentPrompt: blockPrompt || textPrompt,
  };
}

function contextIdFromBlockId(blockId) {
  const parts = String(blockId || '').split(':');
  return parts.length > 1 ? parts[1] : '';
}

module.exports = {
  PROMPT_BODY_BLOCK_PREFIX,
  PROMPT_TOOL_BLOCK_ID,
  PROMPT_VARIANT_ACTION_ID,
  REFINEMENT_ACTION_IDS,
  REFINEMENT_REQUESTS,
  VARIANT_REQUESTS,
  buildPromptResponseBlocks,
  contextIdFromBlockId,
  extractPromptFromText,
  extractPromptContextFromMessage,
  extractToolFromText,
};
