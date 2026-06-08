const REQUIRED_ENV = [
  'SLACK_BOT_TOKEN',
  'SLACK_APP_TOKEN',
  'SLACK_SIGNING_SECRET',
  'OPENAI_API_KEY',
];

function loadEnv(source = process.env) {
  const missing = REQUIRED_ENV.filter((key) => !source[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    SLACK_BOT_TOKEN: source.SLACK_BOT_TOKEN,
    SLACK_APP_TOKEN: source.SLACK_APP_TOKEN,
    SLACK_SIGNING_SECRET: source.SLACK_SIGNING_SECRET,
    OPENAI_API_KEY: source.OPENAI_API_KEY,
    OPENAI_MODEL: source.OPENAI_MODEL || 'gpt-5.5',
    OPENAI_REASONING_EFFORT: source.OPENAI_REASONING_EFFORT || 'medium',
    NODE_ENV: source.NODE_ENV || 'development',
    LOG_LEVEL: source.LOG_LEVEL || 'info',
    PORT: Number(source.PORT || 3000),
  };
}

module.exports = { REQUIRED_ENV, loadEnv };
