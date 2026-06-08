const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PROMPT_VARIANT_ACTION_ID,
  REFINEMENT_ACTION_IDS,
  buildPromptResponseBlocks,
  extractPromptContextFromMessage,
} = require('../src/slack/responseBlocks');

function textBlocks(blocks) {
  return blocks
    .filter((block) => block.text?.text)
    .map((block) => block.text.text)
    .join('\n');
}

test('buildPromptResponseBlocks renders prompt response as Slack blocks without feedback buttons', () => {
  const blocks = buildPromptResponseBlocks({
    tool: 'Codex',
    improvedPrompt: 'Actúa como Codex y agregá validaciones con tests.',
    questions: ['¿Qué contrato no debe cambiar?'],
    checklist: ['No pegues secretos'],
    strategy: 'Scope lock + tests',
    qualityScore: 82,
    detectedIssues: ['Falta criterio de aceptación'],
    recommendedActions: ['refine_add_acceptance_criteria'],
  });
  const text = textBlocks(blocks);
  const actionElements = blocks
    .filter((block) => block.type === 'actions')
    .flatMap((block) => block.elements || []);

  assert.match(text, /Prompt mejorado/);
  assert.match(text, /Herramienta destino:\* Codex/);
  assert.doesNotMatch(text, /Calidad del prompt original/i);
  assert.doesNotMatch(text, /82\/100/);
  assert.match(text, /Falta criterio de aceptación/);
  assert.match(text, /Contexto que conviene aclarar/);
  assert.match(text, /Checklist antes de usarlo/);
  assert.equal(actionElements.some((element) => /útil/i.test(element.text?.text || '')), false);
  assert.equal(actionElements.some((element) => /no útil/i.test(element.text?.text || '')), false);
});

test('buildPromptResponseBlocks chunks long prompts within Slack section text limits and keeps extraction possible', () => {
  const longPrompt = 'Validá payload sin cambiar contrato. '.repeat(180);
  const blocks = buildPromptResponseBlocks({
    tool: 'ChatGPT',
    improvedPrompt: longPrompt,
    questions: [],
    checklist: [],
    strategy: 'Prompt compacto',
  });

  for (const block of blocks) {
    if (block.type === 'section' && block.text?.text) {
      assert.equal(block.text.text.length <= 3000, true, `${block.block_id || 'section'} exceeds Slack section text limit`);
    }
  }

  const extracted = extractPromptContextFromMessage({ blocks });
  assert.equal(extracted.currentPrompt, longPrompt.trim());
  assert.equal(extracted.tool, 'ChatGPT');
});

test('buildPromptResponseBlocks exposes refinement buttons and one variant select', () => {
  const blocks = buildPromptResponseBlocks({
    tool: 'Cursor',
    improvedPrompt: 'Prompt base',
    questions: [],
    checklist: [],
    strategy: 'Base',
  });
  const actionElements = blocks
    .filter((block) => block.type === 'actions')
    .flatMap((block) => block.elements || []);

  for (const actionId of Object.values(REFINEMENT_ACTION_IDS)) {
    assert.equal(actionElements.some((element) => element.action_id === actionId), true, `${actionId} should be rendered`);
  }

  const variantSelect = actionElements.find((element) => element.action_id === PROMPT_VARIANT_ACTION_ID);
  assert.equal(variantSelect.type, 'static_select');
  assert.deepEqual(
    variantSelect.options.map((option) => option.value),
    [
      'variant_short',
      'variant_full',
      'variant_agentic',
      'variant_codex',
      'variant_chatgpt',
      'variant_cursor',
      'variant_copilot',
      'variant_claude_code',
    ]
  );
});

test('extractPromptContextFromMessage returns empty prompt when response blocks are missing', () => {
  const extracted = extractPromptContextFromMessage({ blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'otro mensaje' } }] });

  assert.deepEqual(extracted, { tool: '', currentPrompt: '' });
});

test('extractPromptContextFromMessage preserves numeric order for more than ten prompt chunks', () => {
  const longPrompt = Array.from({ length: 14 }, (_, index) => `chunk-${String(index).padStart(2, '0')}-` + 'x'.repeat(2800)).join('');
  const blocks = buildPromptResponseBlocks({
    tool: 'Codex',
    improvedPrompt: longPrompt,
    questions: [],
    checklist: [],
    strategy: 'Chunking',
  });

  const extracted = extractPromptContextFromMessage({ blocks });

  assert.equal(extracted.currentPrompt, longPrompt);
});

test('refinement and variant requests are structured contracts for the LLM', () => {
  const {
    REFINEMENT_REQUESTS,
    VARIANT_REQUESTS,
  } = require('../src/slack/responseBlocks');

  for (const [key, request] of Object.entries({ ...REFINEMENT_REQUESTS, ...VARIANT_REQUESTS })) {
    assert.match(request, /Tipo:/, `${key} should declare a type`);
    assert.match(request, /Objetivo:/, `${key} should declare an objective`);
    assert.match(request, /Debe:/, `${key} should declare what the LLM must do`);
    assert.match(request, /No debe:/, `${key} should declare what the LLM must not do`);
  }

  assert.match(REFINEMENT_REQUESTS.prompt_refine_add_tests, /No debe:[\s\S]*afirmar que ejecutó tests/i);
  assert.match(REFINEMENT_REQUESTS.prompt_refine_shorter, /conservar[\s\S]*restricciones/i);
  assert.match(VARIANT_REQUESTS.variant_codex, /stop conditions/i);
});
