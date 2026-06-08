const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PROMPT_VARIANT_ACTION_ID,
  REFINEMENT_ACTION_IDS,
  buildPromptResponseBlocks,
} = require('../src/slack/responseBlocks');
const { MESSAGE_SHORTCUT_CALLBACK_ID } = require('../src/slack/shortcuts');
const { registerPromptView } = require('../src/slack/views');
const { registerPromptShortcut } = require('../src/slack/shortcuts');

function createFakeApp() {
  const handlers = { actions: new Map(), shortcuts: new Map(), views: new Map() };
  return {
    handlers,
    action(actionId, handler) {
      handlers.actions.set(actionId, handler);
    },
    shortcut(callbackId, handler) {
      handlers.shortcuts.set(callbackId, handler);
    },
    view(callbackId, handler) {
      handlers.views.set(callbackId, handler);
    },
  };
}

test('registerPromptView registers refinement and variant handlers without feedback handlers', () => {
  const app = createFakeApp();

  registerPromptView(app, { coach: { generate: async () => ({}), refine: async () => ({}), variant: async () => ({}) } });

  assert.equal([...app.handlers.actions.keys()].some((actionId) => /feedback/i.test(actionId)), false);
  for (const actionId of Object.values(REFINEMENT_ACTION_IDS)) {
    assert.equal(typeof app.handlers.actions.get(actionId), 'function', `${actionId} should be registered`);
  }
  assert.equal(typeof app.handlers.actions.get(PROMPT_VARIANT_ACTION_ID), 'function');
});

test('refinement action calls OpenAI through coach using prompt extracted from Slack blocks', async () => {
  const app = createFakeApp();
  const coachCalls = [];
  registerPromptView(app, {
    coach: {
      refine: async (request) => {
        coachCalls.push(request);
        return {
          tool: request.tool,
          improvedPrompt: 'Prompt refinado con pruebas.',
          questions: [],
          checklist: [],
          strategy: 'Refinamiento',
        };
      },
    },
  });
  const calls = [];
  const blocks = buildPromptResponseBlocks({
    tool: 'Codex',
    improvedPrompt: 'Prompt actual para validar endpoint.',
    questions: [],
    checklist: [],
    strategy: 'Base',
  });

  await app.handlers.actions.get(REFINEMENT_ACTION_IDS.addTests)({
    ack: async () => calls.push({ type: 'ack' }),
    body: { channel: { id: 'C123' }, user: { id: 'U123' }, message: { blocks } },
    client: { chat: { postEphemeral: async (payload) => calls.push({ type: 'ephemeral', payload }) } },
    logger: { error: () => calls.push({ type: 'error' }) },
  });

  assert.equal(calls[0].type, 'ack');
  assert.equal(calls[1].type, 'ephemeral');
  assert.match(calls[1].payload.text, /generando/i);
  assert.equal(coachCalls.length, 1);
  assert.equal(coachCalls[0].tool, 'Codex');
  assert.equal(coachCalls[0].currentPrompt, 'Prompt actual para validar endpoint.');
  assert.match(coachCalls[0].refinement, /pruebas/i);
  assert.equal(calls[2].type, 'ephemeral');
  assert.equal(Array.isArray(calls[2].payload.blocks), true);
});

test('refinement action returns private error when prompt cannot be extracted', async () => {
  const app = createFakeApp();
  let coachCalled = false;
  registerPromptView(app, {
    coach: {
      refine: async () => {
        coachCalled = true;
      },
    },
  });
  const calls = [];

  await app.handlers.actions.get(REFINEMENT_ACTION_IDS.shorter)({
    ack: async () => calls.push({ type: 'ack' }),
    body: { channel: { id: 'C123' }, user: { id: 'U123' }, message: { blocks: [] } },
    client: { chat: { postEphemeral: async (payload) => calls.push({ type: 'ephemeral', payload }) } },
    logger: { error: () => calls.push({ type: 'error' }) },
  });

  assert.equal(coachCalled, false);
  assert.match(calls[1].payload.text, /no contiene suficiente contexto/i);
});

test('variant select calls coach.variant with selected variant and extracted prompt', async () => {
  const app = createFakeApp();
  const coachCalls = [];
  registerPromptView(app, {
    coach: {
      variant: async (request) => {
        coachCalls.push(request);
        return {
          tool: request.tool,
          improvedPrompt: 'Prompt versión Codex.',
          questions: [],
          checklist: [],
          strategy: 'Variante',
        };
      },
    },
  });
  const calls = [];
  const blocks = buildPromptResponseBlocks({
    tool: 'ChatGPT',
    improvedPrompt: 'Prompt actual.',
    questions: [],
    checklist: [],
    strategy: 'Base',
  });

  await app.handlers.actions.get(PROMPT_VARIANT_ACTION_ID)({
    ack: async () => calls.push({ type: 'ack' }),
    body: {
      channel: { id: 'C123' },
      user: { id: 'U123' },
      message: { blocks },
      actions: [{ selected_option: { value: 'variant_codex' } }],
    },
    client: { chat: { postEphemeral: async (payload) => calls.push({ type: 'ephemeral', payload }) } },
    logger: { error: () => calls.push({ type: 'error' }) },
  });

  assert.equal(coachCalls.length, 1);
  assert.equal(calls[1].type, 'ephemeral');
  assert.match(calls[1].payload.text, /generando/i);
  assert.equal(coachCalls[0].currentPrompt, 'Prompt actual.');
  assert.equal(coachCalls[0].variant, 'variant_codex');
  assert.equal(calls[2].type, 'ephemeral');
});



test('refinement action can recover current prompt from Slack message text when blocks and cache are unavailable', async () => {
  const app = createFakeApp();
  const coachCalls = [];
  registerPromptView(app, {
    coach: {
      refine: async (request) => {
        coachCalls.push(request);
        return {
          tool: request.tool,
          improvedPrompt: 'Prompt refinado desde texto.',
          questions: [],
          checklist: [],
          strategy: 'Texto fallback',
        };
      },
    },
  });
  const calls = [];
  const messageText = [
    'Hola, te preparé una versión mejorada del prompt.',
    '',
    '*Herramienta destino:* Codex',
    '*Estrategia aplicada:* Base',
    '*Calidad del prompt original:* 80/100',
    '',
    '*Prompt mejorado:*',
    '',
    '```text',
    'Prompt visible dentro del fallback text.',
    '```',
    '',
    '*Contexto que conviene aclarar antes de usarlo:*',
    '',
    'No detecté contexto crítico faltante.',
  ].join('\n');

  await app.handlers.actions.get(REFINEMENT_ACTION_IDS.shorter)({
    ack: async () => calls.push({ type: 'ack' }),
    body: {
      channel: { id: 'C123' },
      user: { id: 'U123' },
      message: { text: messageText },
      actions: [{ block_id: 'prompt_refinement_actions:missing-cache-id' }],
    },
    client: { chat: { postEphemeral: async (payload) => calls.push({ type: 'ephemeral', payload }) } },
    logger: { error: () => calls.push({ type: 'error' }) },
  });

  assert.equal(coachCalls.length, 1);
  assert.equal(calls[1].type, 'ephemeral');
  assert.match(calls[1].payload.text, /generando/i);
  assert.equal(coachCalls[0].tool, 'Codex');
  assert.equal(coachCalls[0].currentPrompt, 'Prompt visible dentro del fallback text.');
  assert.equal(calls[2].type, 'ephemeral');
});

test('variant select can refine using prompt cache when Slack interaction omits message blocks', async () => {
  const app = createFakeApp();
  const coachCalls = [];
  registerPromptView(app, {
    coach: {
      variant: async (request) => {
        coachCalls.push(request);
        return {
          tool: request.tool,
          improvedPrompt: 'Prompt versión corta.',
          questions: [],
          checklist: [],
          strategy: 'Variante corta',
        };
      },
    },
  });
  const calls = [];
  const blocks = buildPromptResponseBlocks({
    tool: 'Codex',
    improvedPrompt: 'Prompt actual desde cache.',
    questions: [],
    checklist: [],
    strategy: 'Base',
  });
  const variantBlock = blocks.find((block) => block.block_id?.startsWith('prompt_variant_actions'));

  await app.handlers.actions.get(PROMPT_VARIANT_ACTION_ID)({
    ack: async () => calls.push({ type: 'ack' }),
    body: {
      channel: { id: 'C123' },
      user: { id: 'U123' },
      message: {},
      actions: [{ block_id: variantBlock.block_id, selected_option: { value: 'variant_short' } }],
    },
    client: { chat: { postEphemeral: async (payload) => calls.push({ type: 'ephemeral', payload }) } },
    logger: { error: () => calls.push({ type: 'error' }) },
  });

  assert.equal(coachCalls.length, 1);
  assert.equal(calls[1].type, 'ephemeral');
  assert.match(calls[1].payload.text, /generando/i);
  assert.equal(coachCalls[0].tool, 'Codex');
  assert.equal(coachCalls[0].currentPrompt, 'Prompt actual desde cache.');
  assert.equal(calls[2].type, 'ephemeral');
});

test('message shortcut opens /prompt modal with message text prefilled and truncated for Slack input limits', async () => {
  const app = createFakeApp();
  registerPromptShortcut(app);
  const calls = [];
  const longText = 'Codex arreglá este endpoint. '.repeat(200);

  await app.handlers.shortcuts.get(MESSAGE_SHORTCUT_CALLBACK_ID)({
    ack: async () => calls.push({ type: 'ack' }),
    body: {
      trigger_id: 'TRIGGER123',
      channel: { id: 'C123' },
      user: { id: 'U123' },
      message: { text: longText },
    },
    client: { views: { open: async (payload) => calls.push({ type: 'open', payload }) } },
    logger: { error: () => calls.push({ type: 'error' }) },
  });

  assert.equal(calls[0].type, 'ack');
  assert.equal(calls[1].type, 'open');
  const modalBlocks = calls[1].payload.view.blocks;
  const rawPromptInput = modalBlocks.find((block) => block.block_id === 'raw_prompt_block');
  assert.equal(rawPromptInput.element.initial_value.length, 3000);
  assert.match(rawPromptInput.element.initial_value, /^Codex arreglá este endpoint/);
  assert.equal(modalBlocks.some((block) => block.block_id === 'guide_block'), false);
  assert.equal(modalBlocks.some((block) => block.block_id === 'guide_actions_block'), false);
});
