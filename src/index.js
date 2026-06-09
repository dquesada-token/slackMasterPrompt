require('dotenv').config();

const { App } = require('@slack/bolt');
const { createAzureTextGenerator } = require('./llm/azureOpenAIClient');
const { createPromptCoach } = require('./prompt/promptCoach');
const { registerPromptCommand } = require('./slack/commands');
const { registerPromptShortcut } = require('./slack/shortcuts');
const { registerPromptView } = require('./slack/views');
const { loadEnv } = require('./utils/env');
const { createLogger } = require('./utils/logger');

async function buildApp() {
  const env = loadEnv();
  const logger = createLogger(env.LOG_LEVEL);
  const generateText = await createAzureTextGenerator({
    apiKey: env.AZURE_OPENAI_API_KEY,
    baseURL: env.AZURE_OPENAI_ENDPOINT,
    model: env.AZURE_OPENAI_MODEL,
    reasoningEffort: env.AZURE_OPENAI_REASONING_EFFORT,
  });
  const coach = createPromptCoach({ generateText });

  const app = new App({
    token: env.SLACK_BOT_TOKEN,
    signingSecret: env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: env.SLACK_APP_TOKEN,
  });

  registerPromptCommand(app);
  registerPromptShortcut(app);
  registerPromptView(app, { coach });

  return { app, logger, env };
}

async function start() {
  const { app, logger, env } = await buildApp();
  await app.start(env.PORT);
  logger.info('Slack Prompt Coach started in Socket Mode', {
    nodeEnv: env.NODE_ENV,
    model: env.AZURE_OPENAI_MODEL,
    reasoningEffort: env.AZURE_OPENAI_REASONING_EFFORT,
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Failed to start Slack Prompt Coach', { error: error.message });
    process.exit(1);
  });
}

module.exports = { buildApp, start };
