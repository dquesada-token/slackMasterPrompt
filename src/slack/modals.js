const PROMPT_MODAL_CALLBACK_ID = 'prompt_coach_submission';
const PROMPT_GUIDE_CALLBACK_ID = 'prompt_use_cases_guide';
const PROMPT_GUIDE_ACTION_ID = 'prompt_use_cases_guide_open';
const PROMPT_EXAMPLES_CALLBACK_ID = 'prompt_examples_guide';
const PROMPT_EXAMPLES_ACTION_ID = 'prompt_examples_open';

const BLOCK_IDS = {
  guide: 'guide_block',
  examples: 'examples_block',
  goal: 'goal_block',
  tool: 'tool_block',
  context: 'context_block',
  output: 'output_block',
  constraints: 'constraints_block',
};

const ACTION_IDS = {
  guide: PROMPT_GUIDE_ACTION_ID,
  examples: PROMPT_EXAMPLES_ACTION_ID,
  goal: 'goal_input',
  tool: 'tool_select',
  context: 'context_input',
  output: 'output_input',
  constraints: 'constraints_input',
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

function inputBlock({ blockId, actionId, label, placeholder, multiline = true }) {
  return {
    type: 'input',
    block_id: blockId,
    label: plainText(label),
    element: {
      type: 'plain_text_input',
      action_id: actionId,
      placeholder: placeholder ? plainText(placeholder) : undefined,
      multiline,
    },
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
      text: markdownText('Prepará un prompt de desarrollo con objetivo, contexto, salida esperada y límites. Si no sabés por dónde empezar, revisá casos de uso o ejemplos completos.'),
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

function buildPromptModal(metadata = {}) {
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
      ...helpSectionBlocks(),
      sectionHeader('Resultado'),
      inputBlock({
        blockId: BLOCK_IDS.goal,
        actionId: ACTION_IDS.goal,
        label: 'Qué querés lograr',
        placeholder: 'Ej: Agregar validación de payload en POST /payments sin cambiar la respuesta actual',
      }),
      inputBlock({
        blockId: BLOCK_IDS.output,
        actionId: ACTION_IDS.output,
        label: 'Qué querés recibir',
        placeholder: 'Ej: Prompt para pedir implementación incremental con tests y criterios de aceptación',
      }),
      spacer(),
      sectionHeader('Contexto'),
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
        blockId: BLOCK_IDS.context,
        actionId: ACTION_IDS.context,
        label: 'Tecnología o contexto',
        placeholder: 'Ej: Node.js 20, Express, endpoint POST /payments, usa node:test',
      }),
      spacer(),
      sectionHeader('Límites'),
      inputBlock({
        blockId: BLOCK_IDS.constraints,
        actionId: ACTION_IDS.constraints,
        label: 'Qué NO debe hacer la IA',
        placeholder: 'Ej: No cambiar contratos existentes, no tocar DB, no asumir archivos no compartidos',
      }),
    ],
  };
}

function useCaseBlock(title, whenToUse, whatToComplete, avoid) {
  return {
    type: 'section',
    text: markdownText(`*${title}*\n*Cuándo usarlo:* ${whenToUse}\n*Qué completar:* ${whatToComplete}\n*Evitá:* ${avoid}`),
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
        text: markdownText('Usá esta guía para completar el formulario con más contexto sin convertirlo en una plantilla rígida.'),
      },
      spacer(),
      useCaseBlock(
        'Convertir una idea vaga en un prompt accionable',
        'cuando sabés lo que querés lograr, pero tu pedido todavía suena genérico o incompleto.',
        'objetivo, herramienta destino, contexto técnico mínimo, salida esperada y límites importantes.',
        'mandar una frase suelta como “ayudame con esto” sin explicar resultado ni restricciones.'
      ),
      useCaseBlock(
        'Preparar un prompt para una herramienta concreta',
        'cuando vas a usar ChatGPT, Codex, Cursor, GitHub Copilot o Claude Code y necesitás adaptar el pedido.',
        'herramienta destino, qué puede asumir, qué no puede hacer, formato de respuesta y nivel de autonomía.',
        'usar el mismo prompt para todas las herramientas aunque tengan capacidades distintas.'
      ),
      useCaseBlock(
        'Evitar que la IA invente contexto',
        'cuando tu prompt necesita dejar claro qué información viene de vos y qué debe tratarse como supuesto.',
        'datos confirmados, contexto faltante, supuestos permitidos, preguntas pendientes y fuentes no disponibles.',
        'decir o insinuar que la IA revisó archivos, repositorios, PRs o código si no los recibió.'
      ),
      useCaseBlock(
        'Definir límites antes de pedir cambios',
        'cuando querés que la IA ayude sin tocar comportamiento, APIs, seguridad o partes sensibles.',
        'qué sí puede proponer, qué queda fuera, restricciones técnicas, criterios de aceptación y pruebas esperadas.',
        'pedir cambios abiertos sin “no tocar”, “no asumir” o “detenerse si falta contexto”.'
      ),
      useCaseBlock(
        'Mejorar un prompt que ya escribiste',
        'cuando ya tenés un borrador y querés volverlo más claro, específico y testeable antes de usarlo.',
        'prompt actual, problema que ves, herramienta donde lo usarás, output deseado y tono preferido.',
        'solo pedir “mejoralo” sin decir qué calidad, profundidad o restricciones necesitás.'
      ),
    ],
  };
}


function exampleBlock(title, fields) {
  return {
    type: 'section',
    text: markdownText(`*${title}*
*Qué querés lograr:* ${fields.goal}
*Qué querés recibir:* ${fields.output}
*Qué herramienta vas a usar:* ${fields.tool}
*Tecnología o contexto:* ${fields.context}
*Qué NO debe hacer la IA:* ${fields.constraints}`),
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
        text: markdownText('Ejemplos realistas de cómo un developer Node.js podría llenar el formulario.'),
      },
      spacer(),
      exampleBlock('Desarrollo', {
        goal: 'Agregar validación de payload en `POST /payments` para rechazar requests sin amount, currency o customerId. La validación debe devolver errores claros y mantener intacta la respuesta exitosa actual.',
        output: 'Un prompt para Codex que pida implementación incremental: entender el flujo actual, proponer validación mínima, agregar tests con `node:test`, explicar riesgos, definir criterios de aceptación y devolver un resumen de archivos que deberían cambiar.',
        tool: 'Codex',
        context: 'Node.js 20, Express, endpoint `POST /payments`. El handler ya crea pagos correctamente, pero hoy acepta payloads incompletos. El proyecto usa `node:test` y no quiero asumir acceso a archivos que no pegue en el prompt.',
        constraints: 'No cambiar contrato de respuesta exitosa, no tocar DB, no agregar librerías de validación todavía y no afirmar que revisó el repo. Mantener compatibilidad con clientes actuales y documentar supuestos. Si falta contexto crítico, que lo marque como contexto por aclarar antes de proponer cambios.',
      }),
      spacer(),
      exampleBlock('Pruebas', {
        goal: 'Crear tests unitarios para el servicio `orderTotals` que calcula subtotal, impuestos, descuentos y total final. Necesito cubrir casos borde como orden vacía, descuentos mayores al subtotal y currency inválida.',
        output: 'Un prompt para Cursor que pida una suite con `node:test`, tabla de casos, mocks mínimos si hacen falta, nombres de tests claros y explicación de qué comportamiento queda cubierto por cada test.',
        tool: 'Cursor',
        context: 'Node.js 20, módulo `orderTotals`, usa `node:test`. No hay fixtures compartidos confiables y los tests existentes son pocos. Quiero que el prompt le pida al agente leer primero el contrato esperado antes de escribir tests.',
        constraints: 'No cambiar lógica productiva todavía, no agregar dependencias nuevas, no inventar reglas de negocio y evitar snapshots frágiles. Si detecta ambigüedad en impuestos o descuentos, debe marcarla como contexto faltante y proponer nombres de casos sin escribir implementación productiva.',
      }),
      spacer(),
      exampleBlock('Refactor', {
        goal: 'Refactorizar un middleware de autenticación para separar parsing del token, validación JWT y validación de permisos, y mantener compatibilidad con rutas existentes.',
        output: 'Un prompt para Claude Code que pida plan incremental, identificación de riesgos, cambios pequeños, pruebas de regresión, checkpoints de revisión y condiciones para detenerse si el comportamiento actual no está claro.',
        tool: 'Claude Code',
        context: 'Node.js 20, Express middleware, JWT, rutas protegidas y tests con `node:test`. El middleware actual mezcla lectura de header, verificación del token y chequeo de roles en una sola función.',
        constraints: 'No cambiar comportamiento público, no modificar formato del token, no cambiar nombres de headers, no mezclar con features nuevas y no asumir archivos no compartidos. Debe preservar errores actuales salvo que proponga una razón explícita y detenerse antes de tocar auth sensible fuera del middleware.',
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
    goal: clean(valueAt(values, BLOCK_IDS.goal, ACTION_IDS.goal)),
    tool: clean(valueAt(values, BLOCK_IDS.tool, ACTION_IDS.tool)),
    context: clean(valueAt(values, BLOCK_IDS.context, ACTION_IDS.context)),
    expectedOutput: clean(valueAt(values, BLOCK_IDS.output, ACTION_IDS.output)),
    constraints: clean(valueAt(values, BLOCK_IDS.constraints, ACTION_IDS.constraints)),
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
