const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PROMPT_EXAMPLES_ACTION_ID,
  PROMPT_EXAMPLES_CALLBACK_ID,
  PROMPT_GUIDE_ACTION_ID,
  PROMPT_GUIDE_CALLBACK_ID,
} = require('../src/slack/modals');
const { registerPromptView } = require('../src/slack/views');

function createFakeApp() {
  const handlers = { actions: new Map(), views: new Map() };
  return {
    handlers,
    action(actionId, handler) {
      handlers.actions.set(actionId, handler);
    },
    view(callbackId, handler) {
      handlers.views.set(callbackId, handler);
    },
  };
}

test('registerPromptView registers a use case guide action handler', () => {
  const app = createFakeApp();

  registerPromptView(app, { coach: { improve: async () => 'ok' } });

  assert.equal(typeof app.handlers.actions.get(PROMPT_GUIDE_ACTION_ID), 'function');
});

test('use case guide action pushes a read-only guide modal', async () => {
  const app = createFakeApp();
  registerPromptView(app, { coach: { improve: async () => 'ok' } });
  const handler = app.handlers.actions.get(PROMPT_GUIDE_ACTION_ID);
  const calls = [];

  await handler({
    ack: async () => calls.push({ type: 'ack' }),
    body: { trigger_id: 'TRIGGER123' },
    client: {
      views: {
        push: async (payload) => calls.push({ type: 'push', payload }),
      },
    },
    logger: { error: () => calls.push({ type: 'error' }) },
  });

  assert.equal(calls[0].type, 'ack');
  assert.equal(calls[1].type, 'push');
  assert.equal(calls[1].payload.trigger_id, 'TRIGGER123');
  assert.equal(calls[1].payload.view.type, 'modal');
  assert.equal(calls[1].payload.view.submit.text, 'Volver al formulario');
  assert.equal(Object.hasOwn(calls[1].payload.view, 'close'), false);
});

test('use case guide submission closes only the pushed guide view', async () => {
  const app = createFakeApp();
  registerPromptView(app, { coach: { improve: async () => 'ok' } });
  const handler = app.handlers.views.get(PROMPT_GUIDE_CALLBACK_ID);
  const acks = [];

  await handler({ ack: async (payload) => acks.push(payload) });

  assert.deepEqual(acks, [undefined]);
});


test('registerPromptView registers an examples action handler', () => {
  const app = createFakeApp();

  registerPromptView(app, { coach: { improve: async () => 'ok' } });

  assert.equal(typeof app.handlers.actions.get(PROMPT_EXAMPLES_ACTION_ID), 'function');
});

test('examples action pushes a complete examples modal', async () => {
  const app = createFakeApp();
  registerPromptView(app, { coach: { improve: async () => 'ok' } });
  const handler = app.handlers.actions.get(PROMPT_EXAMPLES_ACTION_ID);
  const calls = [];

  await handler({
    ack: async () => calls.push({ type: 'ack' }),
    body: { trigger_id: 'TRIGGER456' },
    client: {
      views: {
        push: async (payload) => calls.push({ type: 'push', payload }),
      },
    },
    logger: { error: () => calls.push({ type: 'error' }) },
  });

  assert.equal(calls[0].type, 'ack');
  assert.equal(calls[1].type, 'push');
  assert.equal(calls[1].payload.trigger_id, 'TRIGGER456');
  assert.equal(calls[1].payload.view.type, 'modal');
  assert.equal(calls[1].payload.view.callback_id, PROMPT_EXAMPLES_CALLBACK_ID);
  assert.equal(calls[1].payload.view.submit.text, 'Volver al formulario');
});

test('examples guide submission closes only the pushed examples view', async () => {
  const app = createFakeApp();
  registerPromptView(app, { coach: { improve: async () => 'ok' } });
  const handler = app.handlers.views.get(PROMPT_EXAMPLES_CALLBACK_ID);
  const acks = [];

  await handler({ ack: async (payload) => acks.push(payload) });

  assert.deepEqual(acks, [undefined]);
});
