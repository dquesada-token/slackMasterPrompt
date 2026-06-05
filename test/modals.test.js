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

test('buildPromptModal keeps Slack placeholder text within platform limits', () => {
  const modal = buildPromptModal({ channelId: 'C123', userId: 'U123' });

  for (const block of inputBlocks(modal)) {
    const placeholder = block.element.placeholder?.text;
    if (placeholder) {
      assert.equal(
        placeholder.length <= 150,
        true,
        `${block.block_id} placeholder should be at most 150 characters`
      );
    }
  }
});

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

test('buildPromptModal keeps a compact tool plus raw prompt layout', () => {
  const modal = buildPromptModal({ channelId: 'C123', userId: 'U123' });
  const text = allTexts(modal).join('\n');

  assert.match(text, /prompt o idea inicial/i);
  assert.match(text, /Ver casos de uso/);
  assert.match(text, /Ver ejemplos/);
  assert.equal(inputBlocks(modal).length, 2);
});

test('buildPromptModal keeps only tool and raw prompt fields', () => {
  const modal = buildPromptModal({ channelId: 'C123', userId: 'U123' });
  const labels = inputBlocks(modal).map((block) => block.label.text);

  assert.equal(modal.type, 'modal');
  assert.equal(modal.callback_id, PROMPT_MODAL_CALLBACK_ID);
  assert.deepEqual(labels, [
    'Qué herramienta vas a usar',
    'Pegá tu prompt o idea inicial',
  ]);
  assert.equal(JSON.parse(modal.private_metadata).channelId, 'C123');
});

test('buildPromptModal uses a realistic raw prompt placeholder and removes structured fields', () => {
  const modal = buildPromptModal({ channelId: 'C123', userId: 'U123' });
  const placeholders = Object.fromEntries(
    inputBlocks(modal).map((block) => [block.block_id, block.element.placeholder?.text])
  );

  assert.equal(placeholders.tool_block, 'Seleccioná una herramienta');
  assert.equal(
    placeholders.raw_prompt_block,
    'Ej: Pedile a Codex validar POST /payments en Node.js sin cambiar el contrato actual e incluir tests con node:test.'
  );
  for (const removedBlockId of ['goal_block', 'output_block', 'context_block', 'constraints_block', 'mode_block']) {
    assert.equal(Object.hasOwn(placeholders, removedBlockId), false);
  }
  assert.equal(inputBlocks(modal).length, 2);
});

test('buildPromptModal removes emojis and obsolete mode choices from the user-facing modal copy', () => {
  const modal = buildPromptModal({ channelId: 'C123', userId: 'U123' });
  const text = allTexts(modal).join('\n');

  assert.doesNotMatch(text, /[⚡🧠🔍]/u);
  assert.equal(inputBlocks(modal).some((block) => block.block_id === 'mode_block'), false);
  assert.doesNotMatch(text, /Rápido — dame un prompt ya/);
  assert.doesNotMatch(text, /Coach — prompt \+ preguntas inteligentes/);
  assert.doesNotMatch(text, /Estricto — primero aclara huecos importantes/);
  for (const removedLabel of [
    'Qué querés lograr',
    'Qué querés recibir',
    'Tecnología o contexto',
    'Qué NO debe hacer la IA',
  ]) {
    assert.doesNotMatch(text, new RegExp(removedLabel, 'i'));
  }
});

test('buildUseCasesGuideModal creates a secondary modal that submits back to the main form', () => {
  const modal = buildUseCasesGuideModal();

  assert.equal(modal.type, 'modal');
  assert.equal(modal.callback_id, PROMPT_GUIDE_CALLBACK_ID);
  assert.equal(modal.submit.text, 'Volver al formulario');
  assert.equal(Object.hasOwn(modal, 'close'), false);
});

test('buildUseCasesGuideModal explains what raw prompts developers can paste', () => {
  const modal = buildUseCasesGuideModal();
  const text = allTexts(modal).join('\n');

  for (const expected of ['Cuándo usarlo', 'Qué podés pegar', 'Evitá']) {
    assert.match(text, new RegExp(expected, 'i'));
  }

  for (const useCase of [
    'Tengo una idea incompleta',
    'Tengo un prompt malo que quiero mejorar',
    'Adaptar un pedido a una herramienta concreta',
    'Poner límites de alcance',
    'Pedir tests, refactor o debugging',
  ]) {
    assert.match(text, new RegExp(useCase, 'i'));
  }

  for (const oldFormCopy of [
    'Qué completar',
    'objetivo, herramienta destino, contexto técnico mínimo, salida esperada',
    'Qué querés lograr',
    'Qué querés recibir',
    'Tecnología o contexto',
    'Qué NO debe hacer la IA',
  ]) {
    assert.doesNotMatch(text, new RegExp(oldFormCopy, 'i'));
  }
});

test('buildExamplesGuideModal shows three raw prompt examples for Node.js developers', () => {
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
    'Herramienta destino',
    'Prompt o idea inicial',
  ]) {
    assert.equal((text.match(new RegExp(field, 'g')) || []).length, 3);
  }

  for (const removedField of [
    'Qué querés lograr',
    'Qué querés recibir',
    'Tecnología o contexto',
    'Qué NO debe hacer la IA',
  ]) {
    assert.doesNotMatch(text, new RegExp(removedField, 'i'));
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

  assert.equal(text.length > 1500, true);
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

test('extractPromptSubmission returns selected tool and raw prompt from Slack view state', () => {
  const form = extractPromptSubmission({
    state: {
      values: {
        tool_block: { tool_select: { selected_option: { value: 'Codex' } } },
        raw_prompt_block: {
          raw_prompt_input: {
            value: '  Quiero que Codex agregue validación en POST /payments con tests  ',
          },
        },
      },
    },
  });

  assert.deepEqual(form, {
    tool: 'Codex',
    rawPrompt: 'Quiero que Codex agregue validación en POST /payments con tests',
  });
});

test('extractPromptSubmission ignores obsolete structured field values if Slack sends stale modal state', () => {
  const form = extractPromptSubmission({
    state: {
      values: {
        mode_block: { mode_select: { selected_option: { value: 'strict' } } },
        goal_block: { goal_input: { value: 'Mejorar prompts' } },
        context_block: { context_input: { value: 'Node.js' } },
        output_block: { output_input: { value: 'Prompt final' } },
        constraints_block: { constraints_input: { value: 'No revisar repos' } },
      },
    },
  });

  assert.deepEqual(form, {
    tool: '',
    rawPrompt: '',
  });
});

test('modal constants expose stable action ids for guide handling', () => {
  assert.equal(PROMPT_GUIDE_ACTION_ID, 'prompt_use_cases_guide_open');
  assert.equal(ACTION_IDS.guide, PROMPT_GUIDE_ACTION_ID);
  assert.equal(PROMPT_EXAMPLES_ACTION_ID, 'prompt_examples_open');
  assert.equal(ACTION_IDS.examples, PROMPT_EXAMPLES_ACTION_ID);
});
