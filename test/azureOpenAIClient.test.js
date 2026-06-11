const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildAzureOpenAIResponseRequest,
  createAzureTextGenerator,
  promptCoachResponseSchema,
} = require('../src/llm/azureOpenAIClient');

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

test('buildAzureOpenAIResponseRequest configures reasoning effort and enough output budget for prompt coaching', () => {
  const request = buildAzureOpenAIResponseRequest({
    model: 'gpt-5.2',
    reasoningEffort: 'high',
    instructions: 'Sistema',
    input: 'Usuario',
  });

  assert.equal(request.model, 'gpt-5.2');
  assert.deepEqual(request.reasoning, { effort: 'high' });
  assert.equal(request.instructions, 'Sistema');
  assert.equal(request.input, 'Usuario');
  assert.equal(request.max_output_tokens >= 4000, true);
  assert.equal(request.text.format.type, 'json_schema');
  assert.equal(request.text.format.strict, true);
});

test('createAzureTextGenerator builds the SDK client with Azure baseURL and apiKey', async () => {
  const calls = [];

  class FakeOpenAI {
    constructor(config) {
      calls.push({ type: 'constructor', config });
      this.responses = {
        create: async (request) => {
          calls.push({ type: 'request', request });
          return { output_text: '{"improvedPrompt":"ok","questions":[],"checklist":[],"strategy":"s","qualityScore":90,"detectedIssues":[],"recommendedActions":[]}' };
        },
      };
    }
  }

  const generateText = await createAzureTextGenerator({
    apiKey: 'azure-key',
    baseURL: 'https://example.services.ai.azure.com/openai/v1',
    model: 'gpt-5.2',
    reasoningEffort: 'high',
    OpenAIClass: FakeOpenAI,
  });

  const output = await generateText({ instructions: 'Sistema', input: 'Usuario' });

  assert.equal(output.includes('"improvedPrompt"'), true);
  assert.deepEqual(calls[0], {
    type: 'constructor',
    config: {
      apiKey: 'azure-key',
      baseURL: 'https://example.services.ai.azure.com/openai/v1',
    },
  });
  assert.equal(calls[1].type, 'request');
  assert.equal(calls[1].request.model, 'gpt-5.2');
  assert.deepEqual(calls[1].request.reasoning, { effort: 'high' });
});
