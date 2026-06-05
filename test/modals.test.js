const test = require('node:test');
const assert = require('node:assert/strict');

const {
  ACTION_IDS,
  buildExamplesGuideModal,
  buildPromptModal,
  buildUseCasesGuideModal,
  extractPromptSubmission,
  PROMPT_EXAMPLES_ACTION_ID,
  PROMPT_EXAMPLES_CALLBACK_ID,
  PROMPT_GUIDE_ACTION_ID,
  PROMPT_GUIDE_CALLBACK_ID,
  PROMPT_MODAL_CALLBACK_ID,
  TOOL_OPTIONS,
} = require('../src/slack/modals');

function inputBlocks(modal) {
  return modal.blocks.filter((block) => block.type === 'input');
}

function allTexts(value) {
  const texts = [];

  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (typeof node.text === 'string') texts.push(node.text);
    for (const child of Object.values(node)) {
      if (Array.isArray(child)) child.forEach(visit);
      else visit(child);
    }
  }

  visit(value);
  return texts;
}

test('buildPromptModal starts with separate guide and examples buttons', () => {
  const modal = buildPromptModal({ channelId: 'C123', userId: 'U123' });
  const actionsBlock = modal.blocks[1];

  assert.equal(modal.blocks[0].type, 'section');
  assert.match(modal.blocks[0].text.text, /casos de uso/i);
  assert.match(modal.blocks[0].text.text, /ejemplos/i);
  assert.equal(actionsBlock.type, 'actions');
  assert.equal(actionsBlock.elements.length, 2);
  assert.deepEqual(
    actionsBlock.elements.map((element) => [element.text.text, element.action_id]),
    [
      ['Ver casos de uso', PROMPT_GUIDE_ACTION_ID],
      ['Ver ejemplos', PROMPT_EXAMPLES_ACTION_ID],
    ]
  );
});

test('buildPromptModal groups fields with section headers for a less cramped layout', () => {
  const modal = buildPromptModal({ channelId: 'C123', userId: 'U123' });
  const text = allTexts(modal).join('\n');

  assert.match(text, /Resultado/);
  assert.match(text, /Contexto/);
  assert.match(text, /Límites/);
  assert.equal(modal.blocks.filter((block) => block.type === 'divider').length >= 3, true);
});

test('buildPromptModal keeps practical developer fields in intention-first order', () => {
  const modal = buildPromptModal({ channelId: 'C123', userId: 'U123' });
  const labels = inputBlocks(modal).map((block) => block.label.text);

  assert.equal(modal.type, 'modal');
  assert.equal(modal.callback_id, PROMPT_MODAL_CALLBACK_ID);
  assert.deepEqual(labels, [
    'Qué querés lograr',
    'Qué querés recibir',
    'Qué herramienta vas a usar',
    'Tecnología o contexto',
    'Qué NO debe hacer la IA',
  ]);
  assert.equal(JSON.parse(modal.private_metadata).channelId, 'C123');
});

test('buildPromptModal uses realistic field placeholders and keeps the same five inputs', () => {
  const modal = buildPromptModal({ channelId: 'C123', userId: 'U123' });
  const placeholders = Object.fromEntries(
    inputBlocks(modal).map((block) => [block.block_id, block.element.placeholder?.text])
  );

  assert.equal(placeholders.goal_block, 'Ej: Agregar validación de payload en POST /payments sin cambiar la respuesta actual');
  assert.equal(placeholders.output_block, 'Ej: Prompt para pedir implementación incremental con tests y criterios de aceptación');
  assert.equal(placeholders.tool_block, 'Seleccioná una herramienta');
  assert.equal(placeholders.context_block, 'Ej: Node.js 20, Express, endpoint POST /payments, usa node:test');
  assert.equal(placeholders.constraints_block, 'Ej: No cambiar contratos existentes, no tocar DB, no asumir archivos no compartidos');
  assert.equal(Object.hasOwn(placeholders, 'mode_block'), false);
  assert.equal(inputBlocks(modal).length, 5);
});

test('buildPromptModal removes emojis and obsolete mode choices from the user-facing modal copy', () => {
  const modal = buildPromptModal({ channelId: 'C123', userId: 'U123' });
  const text = allTexts(modal).join('\n');

  assert.doesNotMatch(text, /[⚡🧠🔍]/u);
  assert.equal(inputBlocks(modal).some((block) => block.block_id === 'mode_block'), false);
  assert.doesNotMatch(text, /Rápido — dame un prompt ya/);
  assert.doesNotMatch(text, /Coach — prompt \+ preguntas inteligentes/);
  assert.doesNotMatch(text, /Estricto — primero aclara huecos importantes/);
});

test('buildUseCasesGuideModal creates a secondary modal that submits back to the main form', () => {
  const modal = buildUseCasesGuideModal();

  assert.equal(modal.type, 'modal');
  assert.equal(modal.callback_id, PROMPT_GUIDE_CALLBACK_ID);
  assert.equal(modal.submit.text, 'Volver al formulario');
  assert.equal(Object.hasOwn(modal, 'close'), false);
});

test('buildUseCasesGuideModal explains Master Prompt oriented use cases with practical guidance', () => {
  const modal = buildUseCasesGuideModal();
  const text = allTexts(modal).join('\n');

  for (const expected of ['Cuándo usarlo', 'Qué completar', 'Evitá']) {
    assert.match(text, new RegExp(expected, 'i'));
  }

  for (const useCase of [
    'Convertir una idea vaga en un prompt accionable',
    'Preparar un prompt para una herramienta concreta',
    'Evitar que la IA invente contexto',
    'Definir límites antes de pedir cambios',
    'Mejorar un prompt que ya escribiste',
  ]) {
    assert.match(text, new RegExp(useCase, 'i'));
  }

  for (const oldTaskCentricTitle of [
    'Crear o mejorar tests',
    'Debuggear un problema',
    'Refactor seguro',
    'Documentar o explicar código',
  ]) {
    assert.equal(text.includes(`*${oldTaskCentricTitle}*`), false);
  }
});

test('buildExamplesGuideModal shows three complete Node.js form examples', () => {
  const modal = buildExamplesGuideModal();
  const text = allTexts(modal).join('\n');

  assert.equal(modal.type, 'modal');
  assert.equal(modal.callback_id, PROMPT_EXAMPLES_CALLBACK_ID);
  assert.equal(modal.submit.text, 'Volver al formulario');
  assert.equal(Object.hasOwn(modal, 'close'), false);

  for (const title of ['Desarrollo', 'Pruebas', 'Refactor']) {
    assert.match(text, new RegExp(title, 'i'));
  }

  for (const field of [
    'Qué querés lograr',
    'Qué querés recibir',
    'Qué herramienta vas a usar',
    'Tecnología o contexto',
    'Qué NO debe hacer la IA',
  ]) {
    assert.equal((text.match(new RegExp(field, 'g')) || []).length, 3);
  }

  assert.doesNotMatch(text, /Cómo querés que trabaje el coach/);
  assert.doesNotMatch(text, /Coach|Estricto|Rápido/);

  assert.match(text, /Node\.js 20/i);
  assert.match(text, /Express/i);
  assert.match(text, /node:test/i);
});

test('buildExamplesGuideModal gives rich developer-grade examples, not short placeholders', () => {
  const modal = buildExamplesGuideModal();
  const text = allTexts(modal).join('\n');

  for (const expected of [
    'rechazar requests sin amount, currency o customerId',
    'entender el flujo actual',
    'casos borde como orden vacía',
    'evitar snapshots frágiles',
    'separar parsing del token',
    'mantener compatibilidad con rutas existentes',
    'no afirmar que revisó el repo',
  ]) {
    assert.match(text, new RegExp(expected, 'i'));
  }

  assert.equal(text.length > 3200, true);
});

test('buildPromptModal only offers developer-focused tools', () => {
  assert.deepEqual(TOOL_OPTIONS, [
    'ChatGPT',
    'Codex',
    'Cursor',
    'GitHub Copilot',
    'Claude Code',
    'Otra',
  ]);
  assert.equal(TOOL_OPTIONS.includes('Lovable'), false);
  assert.equal(TOOL_OPTIONS.includes('n8n'), false);
});

test('extractPromptSubmission returns normalized form values from Slack view state without mode', () => {
  const form = extractPromptSubmission({
    state: {
      values: {
        goal_block: { goal_input: { value: '  Mejorar prompts  ' } },
        tool_block: { tool_select: { selected_option: { value: 'Codex' } } },
        context_block: { context_input: { value: ' Node.js ' } },
        output_block: { output_input: { value: ' Prompt final ' } },
        constraints_block: { constraints_input: { value: ' No revisar repos ' } },
      },
    },
  });

  assert.deepEqual(form, {
    goal: 'Mejorar prompts',
    tool: 'Codex',
    context: 'Node.js',
    expectedOutput: 'Prompt final',
    constraints: 'No revisar repos',
  });
});

test('extractPromptSubmission ignores obsolete mode values if Slack sends stale modal state', () => {
  const form = extractPromptSubmission({
    state: {
      values: {
        mode_block: { mode_select: { selected_option: { value: 'strict' } } },
      },
    },
  });

  assert.deepEqual(form, {
    goal: '',
    tool: '',
    context: '',
    expectedOutput: '',
    constraints: '',
  });
});

test('modal constants expose stable action ids for guide handling', () => {
  assert.equal(PROMPT_GUIDE_ACTION_ID, 'prompt_use_cases_guide_open');
  assert.equal(ACTION_IDS.guide, PROMPT_GUIDE_ACTION_ID);
  assert.equal(PROMPT_EXAMPLES_ACTION_ID, 'prompt_examples_open');
  assert.equal(ACTION_IDS.examples, PROMPT_EXAMPLES_ACTION_ID);
});
