const test = require('node:test');
const assert = require('node:assert/strict');

const { loadEnv } = require('../src/utils/env');

const requiredEnv = {
  SLACK_BOT_TOKEN: 'xoxb-test',
  SLACK_APP_TOKEN: 'xapp-test',
  SLACK_SIGNING_SECRET: 'secret',
  AZURE_OPENAI_API_KEY: 'azure-key',
  AZURE_OPENAI_ENDPOINT: 'https://example.services.ai.azure.com/openai/v1',
  AZURE_OPENAI_MODEL: 'gpt-5.2',
};

test('loadEnv defaults Azure reasoning effort to high', () => {
  const env = loadEnv(requiredEnv);

  assert.equal(env.AZURE_OPENAI_MODEL, 'gpt-5.2');
  assert.equal(env.AZURE_OPENAI_REASONING_EFFORT, 'high');
});

test('loadEnv allows overriding Azure reasoning effort with a valid value', () => {
  const env = loadEnv({
    ...requiredEnv,
    AZURE_OPENAI_REASONING_EFFORT: 'medium',
  });

  assert.equal(env.AZURE_OPENAI_MODEL, 'gpt-5.2');
  assert.equal(env.AZURE_OPENAI_REASONING_EFFORT, 'medium');
});

test('loadEnv falls back to high when Azure reasoning effort is invalid', () => {
  const env = loadEnv({
    ...requiredEnv,
    AZURE_OPENAI_REASONING_EFFORT: 'banana',
  });

  assert.equal(env.AZURE_OPENAI_REASONING_EFFORT, 'high');
});

test('loadEnv normalizes an Azure responses endpoint down to the SDK base URL', () => {
  const env = loadEnv({
    ...requiredEnv,
    AZURE_OPENAI_ENDPOINT: 'https://example.services.ai.azure.com/openai/v1/responses',
  });

  assert.equal(env.AZURE_OPENAI_ENDPOINT, 'https://example.services.ai.azure.com/openai/v1');
});
