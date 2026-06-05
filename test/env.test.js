const test = require('node:test');
const assert = require('node:assert/strict');

const { loadEnv } = require('../src/utils/env');

const requiredEnv = {
  SLACK_BOT_TOKEN: 'xoxb-test',
  SLACK_APP_TOKEN: 'xapp-test',
  SLACK_SIGNING_SECRET: 'secret',
  OPENAI_API_KEY: 'sk-test',
};

test('loadEnv defaults to the stronger prompt coaching model with medium reasoning', () => {
  const env = loadEnv(requiredEnv);

  assert.equal(env.OPENAI_MODEL, 'gpt-5.5');
  assert.equal(env.OPENAI_REASONING_EFFORT, 'medium');
});

test('loadEnv allows overriding model and reasoning effort', () => {
  const env = loadEnv({
    ...requiredEnv,
    OPENAI_MODEL: 'gpt-5.4-mini',
    OPENAI_REASONING_EFFORT: 'low',
  });

  assert.equal(env.OPENAI_MODEL, 'gpt-5.4-mini');
  assert.equal(env.OPENAI_REASONING_EFFORT, 'low');
});
