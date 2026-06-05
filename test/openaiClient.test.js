const test = require('node:test');
const assert = require('node:assert/strict');

const { promptCoachResponseSchema } = require('../src/llm/openaiClient');

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
