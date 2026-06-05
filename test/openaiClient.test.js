const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildOpenAIResponseRequest,
  promptCoachResponseSchema,
} = require('../src/llm/openaiClient');

test('promptCoachResponseSchema includes strategy required by the system prompt', () => {
  const schema = promptCoachResponseSchema();

  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(Object.keys(schema.properties).sort(), [
    'checklist',
    'improvedPrompt',
    'questions',
    'strategy',
  ]);
  assert.equal(schema.properties.strategy.type, 'string');
  assert.equal(schema.required.includes('strategy'), true);
});

test('buildOpenAIResponseRequest configures reasoning effort and enough output budget for prompt coaching', () => {
  const request = buildOpenAIResponseRequest({
    model: 'gpt-5.5',
    reasoningEffort: 'medium',
    instructions: 'Sistema',
    input: 'Usuario',
  });

  assert.equal(request.model, 'gpt-5.5');
  assert.deepEqual(request.reasoning, { effort: 'medium' });
  assert.equal(request.instructions, 'Sistema');
  assert.equal(request.input, 'Usuario');
  assert.equal(request.max_output_tokens >= 1800, true);
  assert.equal(request.text.format.type, 'json_schema');
  assert.equal(request.text.format.strict, true);
});
