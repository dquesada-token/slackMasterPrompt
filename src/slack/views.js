const {
  PROMPT_VARIANT_ACTION_ID,
  REFINEMENT_ACTION_IDS,
  REFINEMENT_REQUESTS,
  VARIANT_REQUESTS,
  buildPromptResponseBlocks,
  contextIdFromBlockId,
  extractPromptContextFromMessage,
} = require('./responseBlocks');
const { getPromptContext } = require('./promptContextCache');
const { formatCoachResponse } = require('../prompt/promptCoach');

const {
  buildExamplesGuideModal,
  buildUseCasesGuideModal,
  extractPromptSubmission,
  PROMPT_EXAMPLES_ACTION_ID,
  PROMPT_EXAMPLES_CALLBACK_ID,
  PROMPT_GUIDE_ACTION_ID,
  PROMPT_GUIDE_CALLBACK_ID,
  PROMPT_MODAL_CALLBACK_ID,
} = require('./modals');

function parseMetadata(rawMetadata) {
  try {
    return JSON.parse(rawMetadata || '{}');
  } catch (_error) {
    return {};
  }
}

async function postPrivateResponse({ client, channelId, userId, text, blocks }) {
  if (channelId && userId) {
    try {
      await client.chat.postEphemeral({ channel: channelId, user: userId, text, blocks });
      return;
    } catch (_error) {
      // Fall back to DM below. Avoid logging prompt contents.
    }
  }

  await client.chat.postMessage({ channel: userId, text, blocks });
}

function buildPrivatePromptPayload(response) {
  return {
    text: formatCoachResponse(response),
    blocks: buildPromptResponseBlocks(response),
  };
}

function idsFromBody(body) {
  return {
    channelId: body.channel?.id || body.container?.channel_id || '',
    userId: body.user?.id || '',
  };
}

async function postMissingPromptContext({ client, body }) {
  const { channelId, userId } = idsFromBody(body);
  await postPrivateResponse({
    client,
    channelId,
    userId,
    text: 'No pude refinar este prompt porque el mensaje no contiene suficiente contexto recuperable. Volvé a generar el prompt con /prompt.',
  });
}

function extractInteractionContext(body) {
  const extracted = extractPromptContextFromMessage(body.message);
  if (extracted.currentPrompt) {
    return {
      tool: extracted.tool || 'No especificada',
      currentPrompt: extracted.currentPrompt,
    };
  }

  const contextId = contextIdFromBlockId(body.actions?.[0]?.block_id);
  const cached = getPromptContext(contextId);
  return {
    tool: cached.tool || extracted.tool || 'No especificada',
    currentPrompt: cached.currentPrompt,
  };
}

async function postProcessingNotice({ client, body, text }) {
  const { channelId, userId } = idsFromBody(body);
  await postPrivateResponse({
    client,
    channelId,
    userId,
    text,
  });
}

function registerPromptView(app, { coach }) {
  app.action(PROMPT_GUIDE_ACTION_ID, async ({ ack, body, client, logger }) => {
    await ack();

    try {
      await client.views.push({
        trigger_id: body.trigger_id,
        view: buildUseCasesGuideModal(),
      });
    } catch (error) {
      logger.error('Failed to open prompt coach use cases guide', { error: error.message });
    }
  });

  app.action(PROMPT_EXAMPLES_ACTION_ID, async ({ ack, body, client, logger }) => {
    await ack();

    try {
      await client.views.push({
        trigger_id: body.trigger_id,
        view: buildExamplesGuideModal(),
      });
    } catch (error) {
      logger.error('Failed to open prompt coach examples guide', { error: error.message });
    }
  });

  app.view(PROMPT_GUIDE_CALLBACK_ID, async ({ ack }) => {
    await ack();
  });

  app.view(PROMPT_EXAMPLES_CALLBACK_ID, async ({ ack }) => {
    await ack();
  });

  for (const actionId of Object.values(REFINEMENT_ACTION_IDS)) {
    app.action(actionId, async ({ ack, body, client, logger }) => {
      await ack();

      try {
        const { channelId, userId } = idsFromBody(body);
        const { tool, currentPrompt } = extractInteractionContext(body);
        if (!currentPrompt) {
          await postMissingPromptContext({ client, body });
          return;
        }

        await postProcessingNotice({
          client,
          body,
          text: 'Estoy generando una nueva versión del prompt. Puede tardar unos segundos.',
        });

        const response = await coach.refine({
          tool,
          currentPrompt,
          refinement: REFINEMENT_REQUESTS[actionId],
        });
        await postPrivateResponse({
          client,
          channelId,
          userId,
          ...buildPrivatePromptPayload(response),
        });
      } catch (error) {
        logger.error('Failed to refine prompt coach response', { error: error.message });
        const { channelId, userId } = idsFromBody(body);
        await postPrivateResponse({
          client,
          channelId,
          userId,
          text: 'No pude refinar el prompt en este momento. Intentá de nuevo o generá uno nuevo con /prompt.',
        });
      }
    });
  }

  app.action(PROMPT_VARIANT_ACTION_ID, async ({ ack, body, client, logger }) => {
    await ack();

    try {
      const { channelId, userId } = idsFromBody(body);
      const { tool, currentPrompt } = extractInteractionContext(body);
      const variant = body.actions?.[0]?.selected_option?.value || '';
      if (!currentPrompt || !VARIANT_REQUESTS[variant]) {
        await postMissingPromptContext({ client, body });
        return;
      }

      await postProcessingNotice({
        client,
        body,
        text: 'Estoy generando la variante del prompt. Puede tardar unos segundos.',
      });

      const response = await coach.variant({
        tool,
        currentPrompt,
        variant,
        variantInstruction: VARIANT_REQUESTS[variant],
      });
      await postPrivateResponse({
        client,
        channelId,
        userId,
        ...buildPrivatePromptPayload(response),
      });
    } catch (error) {
      logger.error('Failed to create prompt coach variant', { error: error.message });
      const { channelId, userId } = idsFromBody(body);
      await postPrivateResponse({
        client,
        channelId,
        userId,
        text: 'No pude generar la variante del prompt en este momento. Intentá de nuevo o generá uno nuevo con /prompt.',
      });
    }
  });

  app.view(PROMPT_MODAL_CALLBACK_ID, async ({ ack, body, view, client, logger }) => {
    await ack({ response_action: 'clear' });

    const form = extractPromptSubmission(view);
    const metadata = parseMetadata(view.private_metadata);
    const userId = body.user?.id || metadata.userId;

    try {
      const response = typeof coach.generate === 'function'
        ? await coach.generate(form)
        : { tool: form.tool, improvedPrompt: await coach.improve(form), questions: [], checklist: [], strategy: '' };
      await postPrivateResponse({
        client,
        channelId: metadata.channelId,
        userId,
        ...buildPrivatePromptPayload(response),
      });
    } catch (error) {
      logger.error('Failed to generate prompt coach response', { error: error.message });
      await postPrivateResponse({
        client,
        channelId: metadata.channelId,
        userId,
        text: 'No pude generar el prompt mejorado en este momento. Revisá la configuración del bot o intentá de nuevo.',
      });
    }
  });
}

module.exports = {
  parseMetadata,
  postPrivateResponse,
  registerPromptView,
};
