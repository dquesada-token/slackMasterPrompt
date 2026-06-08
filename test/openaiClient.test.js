const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildOpenAIResponseRequest,
  promptCoachResponseSchema,
} = require('../src/llm/openaiClient');

test('promptCoachResponseSchema includes strategy, linter fields and recommended actions required by the system prompt', () => {
  const schema = promptCoachResponseSchema();

  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(Object.keys(schema.properties).sort(), [
    'checklist',
    'detectedIssues',
    'improvedPrompt',
    'qualityScore',
    'questions',
    'recommendedActions',
    'strategy',
  ]);
  assert.equal(schema.properties.strategy.type, 'string');
  assert.equal(schema.properties.qualityScore.type, 'number');
  assert.equal(schema.properties.detectedIssues.maxItems, 3);
  assert.equal(schema.properties.recommendedActions.maxItems, 3);
  for (const field of ['strategy', 'qualityScore', 'detectedIssues', 'recommendedActions']) {
    assert.equal(schema.required.includes(field), true);
  }
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
