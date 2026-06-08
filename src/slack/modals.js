const PROMPT_MODAL_CALLBACK_ID = 'prompt_coach_submission';
const PROMPT_GUIDE_CALLBACK_ID = 'prompt_use_cases_guide';
const PROMPT_GUIDE_ACTION_ID = 'prompt_use_cases_guide_open';
const PROMPT_EXAMPLES_CALLBACK_ID = 'prompt_examples_guide';
const PROMPT_EXAMPLES_ACTION_ID = 'prompt_examples_open';

const BLOCK_IDS = {
  guide: 'guide_block',
  examples: 'examples_block',
  tool: 'tool_block',
  rawPrompt: 'raw_prompt_block',
};

const ACTION_IDS = {
  guide: PROMPT_GUIDE_ACTION_ID,
  examples: PROMPT_EXAMPLES_ACTION_ID,
  tool: 'tool_select',
  rawPrompt: 'raw_prompt_input',
};

const TOOL_OPTIONS = [
  'ChatGPT',
  'Codex',
  'Cursor',
  'GitHub Copilot',
  'Claude Code',
  'Otra',
];

function plainText(text) {
  return { type: 'plain_text', text, emoji: true };
}

function markdownText(text) {
  return { type: 'mrkdwn', text };
}

function option(text, value) {
  return { text: plainText(text), value };
}

function inputBlock({ blockId, actionId, label, placeholder, multiline = true, initialValue = '' }) {
  const element = {
    type: 'plain_text_input',
    action_id: actionId,
    placeholder: placeholder ? plainText(placeholder) : undefined,
    multiline,
  };

  if (initialValue) {
    element.initial_value = initialValue;
  }

  return {
    type: 'input',
    block_id: blockId,
    label: plainText(label),
    element,
  };
}


function sectionHeader(text) {
  return {
    type: 'section',
    text: markdownText(`*${text}*`),
  };
}

function spacer() {
  return { type: 'divider' };
}

function helpSectionBlocks() {
  return [
    {
      type: 'section',
      block_id: BLOCK_IDS.guide,
      text: markdownText('Elegí la herramienta y pegá tu prompt o idea inicial. No hace falta que venga perfecto: el coach lo ordena, completa estructura y marca el contexto que conviene aclarar. Si no sabés por dónde empezar, revisá casos de uso o ejemplos.'),
    },
    {
      type: 'actions',
      block_id: 'guide_actions_block',
      elements: [
        {
          type: 'button',
          action_id: ACTION_IDS.guide,
          text: plainText('Ver casos de uso'),
          value: 'open_use_cases_guide',
        },
        {
          type: 'button',
          action_id: ACTION_IDS.examples,
          text: plainText('Ver ejemplos'),
          value: 'open_examples_guide',
        },
      ],
    },
    spacer(),
  ];
}

const MAX_RAW_PROMPT_INITIAL_VALUE_LENGTH = 3000;

function truncateInitialValue(value) {
  return clean(value).slice(0, MAX_RAW_PROMPT_INITIAL_VALUE_LENGTH);
}

function buildPromptModal(metadata = {}) {
  const initialRawPrompt = truncateInitialValue(metadata.initialRawPrompt);
  const showHelp = metadata.showHelp !== false;

  return {
    type: 'modal',
    callback_id: PROMPT_MODAL_CALLBACK_ID,
    title: plainText('Prompt Coach'),
    submit: plainText('Mejorar'),
    close: plainText('Cancelar'),
    private_metadata: JSON.stringify({
      channelId: metadata.channelId || '',
      userId: metadata.userId || '',
    }),
    blocks: [
      ...(showHelp ? helpSectionBlocks() : []),
      {
        type: 'input',
        block_id: BLOCK_IDS.tool,
        label: plainText('Qué herramienta vas a usar'),
        element: {
          type: 'static_select',
          action_id: ACTION_IDS.tool,
          placeholder: plainText('Seleccioná una herramienta'),
          options: TOOL_OPTIONS.map((tool) => option(tool, tool)),
        },
      },
      inputBlock({
        blockId: BLOCK_IDS.rawPrompt,
        actionId: ACTION_IDS.rawPrompt,
        label: 'Pegá tu prompt o idea inicial',
        placeholder: 'Ej: Pedile a Codex validar POST /payments en Node.js sin cambiar el contrato actual e incluir tests con node:test.',
        initialValue: initialRawPrompt,
      }),
    ],
  };
}

function useCaseBlock(title, whenToUse, whatToPaste, avoid) {
  return {
    type: 'section',
    text: markdownText(`*${title}*\n*Cuándo usarlo:* ${whenToUse}\n*Qué podés pegar:* ${whatToPaste}\n*Evitá:* ${avoid}`),
  };
}

function buildUseCasesGuideModal() {
  return {
    type: 'modal',
    callback_id: PROMPT_GUIDE_CALLBACK_ID,
    title: plainText('Casos de uso'),
    submit: plainText('Volver al formulario'),
    blocks: [
      {
        type: 'section',
        text: markdownText('Usá esta guía para decidir qué tipo de prompt o idea inicial podés pegar. No necesitás estructurarlo perfecto.'),
      },
      spacer(),
      useCaseBlock(
        'Tengo una idea incompleta',
        'cuando todavía no tenés un prompt formal, solo una intención o tarea técnica.',
        'una frase como “quiero que Codex me ayude a validar un endpoint y agregar tests sin romper contratos”.',
        'dejar fuera límites críticos como no tocar DB, no cambiar API pública o no asumir archivos no compartidos.'
      ),
      useCaseBlock(
        'Tengo un prompt malo que quiero mejorar',
        'cuando ya escribiste algo, pero suena genérico, largo, ambiguo o poco accionable.',
        'tu prompt tal cual, aunque esté desordenado o mezclado con notas.',
        'reescribirlo antes de pegarlo; el valor del coach es ordenar ese borrador.'
      ),
      useCaseBlock(
        'Adaptar un pedido a una herramienta concreta',
        'cuando querés usar Codex, Cursor, GitHub Copilot, Claude Code o ChatGPT y necesitás que el pedido calce con esa herramienta.',
        'la tarea, herramienta elegida y cualquier pista de stack, archivos, tests o límites de autonomía.',
        'asumir que todas las herramientas trabajan igual o que pueden leer/editar cosas que no compartiste.'
      ),
      useCaseBlock(
        'Poner límites de alcance',
        'cuando necesitás que la IA ayude sin pasarse de permisos, cambiar contratos o tocar zonas sensibles.',
        'un pedido con frases como “no cambiar comportamiento público”, “no instalar dependencias” o “detenerse si falta contexto”.',
        'pedir “hacé lo necesario” en tareas con riesgo de seguridad, compatibilidad o producción.'
      ),
      useCaseBlock(
        'Pedir tests, refactor o debugging',
        'cuando tu idea gira alrededor de pruebas, refactor seguro, diagnóstico de errores o explicación técnica.',
        'el síntoma, módulo, stack, comportamiento esperado y cualquier restricción que no querés que la IA rompa.',
        'pedir cambios productivos sin pedir pruebas, edge cases o definición de terminado.'
      ),
    ],
  };
}


function exampleBlock(title, fields) {
  return {
    type: 'section',
    text: markdownText(`*${title}*
*Herramienta destino:* ${fields.tool}
*Prompt o idea inicial:* ${fields.rawPrompt}`),
  };
}

function buildExamplesGuideModal() {
  return {
    type: 'modal',
    callback_id: PROMPT_EXAMPLES_CALLBACK_ID,
    title: plainText('Ejemplos'),
    submit: plainText('Volver al formulario'),
    blocks: [
      {
        type: 'section',
        text: markdownText('Ejemplos realistas de prompts iniciales que un developer Node.js podría pegar antes de mejorarlos.'),
      },
      spacer(),
      exampleBlock('Desarrollo', {
        tool: 'Codex',
        rawPrompt: 'Quiero pedirle a Codex que agregue validación de payload en `POST /payments` para rechazar requests sin amount, currency o customerId. Es Node.js 20 con Express y tests con `node:test`. No quiero cambiar el contrato de respuesta exitosa, no tocar DB ni agregar librerías de validación todavía. Que primero pida entender el flujo actual, proponga cambios pequeños, agregue tests y no afirmar que revisó el repo si no le pego archivos.',
      }),
      spacer(),
      exampleBlock('Pruebas', {
        tool: 'Cursor',
        rawPrompt: 'Necesito que Cursor me ayude a crear tests unitarios para `orderTotals`, que calcula subtotal, impuestos, descuentos y total final. Usamos Node.js 20 y `node:test`. Quiero cubrir casos borde como orden vacía, descuentos mayores al subtotal y currency inválida. No cambiar lógica productiva, no agregar dependencias, evitar snapshots frágiles y si las reglas de impuestos no están claras que lo marque como contexto faltante.',
      }),
      spacer(),
      exampleBlock('Refactor', {
        tool: 'Claude Code',
        rawPrompt: 'Quiero refactorizar un middleware de autenticación en Node.js 20 con Express y JWT. Hoy mezcla parsing del token, validación JWT y permisos en una sola función. Necesito separar parsing del token y otras responsabilidades, mantener compatibilidad con rutas existentes y no cambiar comportamiento público, formato del token, headers ni errores actuales. Que Claude Code proponga plan incremental, pruebas de regresión con `node:test`, checkpoints y se detenga antes de tocar auth sensible fuera del middleware.',
      }),
    ],
  };
}

function valueAt(values, blockId, actionId) {
  const field = values?.[blockId]?.[actionId];
  if (!field) return '';
  if (field.selected_option) return field.selected_option.value || '';
  return field.value || '';
}

function clean(value) {
  return String(value || '').trim();
}

function extractPromptSubmission(view) {
  const values = view?.state?.values || {};
  return {
    tool: clean(valueAt(values, BLOCK_IDS.tool, ACTION_IDS.tool)),
    rawPrompt: clean(valueAt(values, BLOCK_IDS.rawPrompt, ACTION_IDS.rawPrompt)),
  };
}

module.exports = {
  ACTION_IDS,
  BLOCK_IDS,
  PROMPT_EXAMPLES_ACTION_ID,
  PROMPT_EXAMPLES_CALLBACK_ID,
  PROMPT_GUIDE_ACTION_ID,
  PROMPT_GUIDE_CALLBACK_ID,
  PROMPT_MODAL_CALLBACK_ID,
  TOOL_OPTIONS,
  buildExamplesGuideModal,
  buildPromptModal,
  buildUseCasesGuideModal,
  extractPromptSubmission,
};
