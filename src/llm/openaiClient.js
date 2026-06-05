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

async function createOpenAITextGenerator({ apiKey, model }) {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({ apiKey });

  return async function generateText({ instructions, input }) {
    const response = await client.responses.create({
      model,
      instructions,
      input,
      max_output_tokens: 900,
      text: {
        format: {
          type: 'json_schema',
          name: 'prompt_coach_response',
          strict: true,
          schema: promptCoachResponseSchema(),
        },
      },
    });

    return response.output_text || '';
  };
}

module.exports = {
  createOpenAITextGenerator,
  promptCoachResponseSchema,
};
