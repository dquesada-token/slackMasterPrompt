function promptCoachResponseSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      improvedPrompt: { type: 'string' },
      questions: {
        type: 'array',
        maxItems: 3,
        items: { type: 'string' },
      },
      checklist: {
        type: 'array',
        maxItems: 3,
        items: { type: 'string' },
      },
      strategy: { type: 'string' },
    },
    required: ['improvedPrompt', 'questions', 'checklist', 'strategy'],
  };
}

function buildOpenAIResponseRequest({ model, reasoningEffort, instructions, input }) {
  const request = {
    model,
    instructions,
    input,
    max_output_tokens: 2000,
    text: {
      format: {
        type: 'json_schema',
        name: 'prompt_coach_response',
        strict: true,
        schema: promptCoachResponseSchema(),
      },
    },
  };

  if (reasoningEffort) {
    request.reasoning = { effort: reasoningEffort };
  }

  return request;
}

async function createOpenAITextGenerator({ apiKey, model, reasoningEffort }) {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey });

  return async function generateText({ instructions, input }) {
    const response = await client.responses.create(buildOpenAIResponseRequest({
      model,
      reasoningEffort,
      instructions,
      input,
    }));

    return response.output_text || '';
  };
}

module.exports = {
  buildOpenAIResponseRequest,
  createOpenAITextGenerator,
  promptCoachResponseSchema,
};
