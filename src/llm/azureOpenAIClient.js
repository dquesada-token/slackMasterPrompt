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
      qualityScore: { type: 'number' },
      detectedIssues: {
        type: 'array',
        maxItems: 3,
        items: { type: 'string' },
      },
      recommendedActions: {
        type: 'array',
        maxItems: 3,
        items: { type: 'string' },
      },
    },
    required: [
      'improvedPrompt',
      'questions',
      'checklist',
      'strategy',
      'qualityScore',
      'detectedIssues',
      'recommendedActions',
    ],
  };
}

function buildAzureOpenAIResponseRequest({ model, reasoningEffort, instructions, input }) {
  const request = {
    model,
    instructions,
    input,
    max_output_tokens: 4000,
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

async function createAzureTextGenerator({ apiKey, baseURL, model, reasoningEffort, OpenAIClass }) {
  const ResolvedOpenAIClass = OpenAIClass || (await import('openai')).default;
  const client = new ResolvedOpenAIClass({ apiKey, baseURL });

  return async function generateText({ instructions, input }) {
    const response = await client.responses.create(buildAzureOpenAIResponseRequest({
      model,
      reasoningEffort,
      instructions,
      input,
    }));

    return response.output_text || '';
  };
}

module.exports = {
  buildAzureOpenAIResponseRequest,
  createAzureTextGenerator,
  promptCoachResponseSchema,
};
