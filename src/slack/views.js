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

async function postPrivateResponse({ client, channelId, userId, text }) {
  if (channelId && userId) {
    try {
      await client.chat.postEphemeral({ channel: channelId, user: userId, text });
      return;
    } catch (_error) {
      // Fall back to DM below. Avoid logging prompt contents.
    }
  }

  await client.chat.postMessage({ channel: userId, text });
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

  app.view(PROMPT_MODAL_CALLBACK_ID, async ({ ack, body, view, client, logger }) => {
    await ack({ response_action: 'clear' });

    const form = extractPromptSubmission(view);
    const metadata = parseMetadata(view.private_metadata);
    const userId = body.user?.id || metadata.userId;

    try {
      const text = await coach.improve(form);
      await postPrivateResponse({
        client,
        channelId: metadata.channelId,
        userId,
        text,
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
