const { buildPromptModal } = require('./modals');

function registerPromptCommand(app) {
  app.command('/prompt', async ({ ack, body, client, logger }) => {
    await ack();

    try {
      await client.views.open({
        trigger_id: body.trigger_id,
        view: buildPromptModal({
          channelId: body.channel_id,
          userId: body.user_id,
        }),
      });
    } catch (error) {
      logger.error('Failed to open prompt coach modal', { error: error.message });
      throw error;
    }
  });
}

module.exports = { registerPromptCommand };
