const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildPromptModal,
  extractPromptSubmission,
  PROMPT_MODAL_CALLBACK_ID,
} = require('../src/slack/modals');

test('buildPromptModal contains the MVP callback and five required fields', () => {
  const modal = buildPromptModal({ channelId: 'C123', userId: 'U123' });
  const labels = modal.blocks.map((block) => block.label && block.label.text).filter(Boolean);

  assert.equal(modal.type, 'modal');
  assert.equal(modal.callback_id, PROMPT_MODAL_CALLBACK_ID);
  assert.deepEqual(labels, [
    '¿Qué querés lograr con la IA?',
    '¿Qué herramienta vas a usar?',
    '¿Qué tecnología o contexto aplica?',
    '¿Qué salida esperás?',
    '¿Qué NO debe hacer la IA?',
  ]);
  assert.equal(JSON.parse(modal.private_metadata).channelId, 'C123');
});

test('extractPromptSubmission returns normalized form values from Slack view state', () => {
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
