const REQUIRED_ENV = [
  'SLACK_BOT_TOKEN',
  'SLACK_APP_TOKEN',
  'SLACK_SIGNING_SECRET',
  'AZURE_OPENAI_API_KEY',
  'AZURE_OPENAI_ENDPOINT',
  'AZURE_OPENAI_MODEL',
];

const VALID_REASONING_EFFORTS = new Set(['minimal', 'low', 'medium', 'high', 'xhigh']);

function normalizeAzureOpenAIEndpoint(value) {
  const normalized = String(value || '').trim().replace(/\/+$/, '');
  return normalized.replace(/\/responses$/, '');
}

function normalizeReasoningEffort(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return VALID_REASONING_EFFORTS.has(normalized) ? normalized : 'high';
}

function loadEnv(source = process.env) {
  const missing = REQUIRED_ENV.filter((key) => !source[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    SLACK_BOT_TOKEN: source.SLACK_BOT_TOKEN,
    SLACK_APP_TOKEN: source.SLACK_APP_TOKEN,
    SLACK_SIGNING_SECRET: source.SLACK_SIGNING_SECRET,
    AZURE_OPENAI_API_KEY: source.AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_ENDPOINT: normalizeAzureOpenAIEndpoint(source.AZURE_OPENAI_ENDPOINT),
    AZURE_OPENAI_MODEL: source.AZURE_OPENAI_MODEL,
    AZURE_OPENAI_REASONING_EFFORT: normalizeReasoningEffort(source.AZURE_OPENAI_REASONING_EFFORT),
    NODE_ENV: source.NODE_ENV || 'development',
    LOG_LEVEL: source.LOG_LEVEL || 'info',
    PORT: Number(source.PORT || 3000),
  };
}

module.exports = {
  REQUIRED_ENV,
  VALID_REASONING_EFFORTS,
  loadEnv,
  normalizeAzureOpenAIEndpoint,
  normalizeReasoningEffort,
};
