const { buildPromptModal } = require('./modals');

const MESSAGE_SHORTCUT_CALLBACK_ID = 'prompt_coach_message_shortcut';
const MAX_INITIAL_PROMPT_LENGTH = 3000;

function normalizeText(value) {
  return String(value || '').trim();
}

function truncateForSlackInput(value) {
  return normalizeText(value).slice(0, MAX_INITIAL_PROMPT_LENGTH);
}

function registerPromptShortcut(app) {
  app.shortcut(MESSAGE_SHORTCUT_CALLBACK_ID, async ({ ack, body, client, logger }) => {
    await ack();

    try {
      await client.views.open({
        trigger_id: body.trigger_id,
        view: buildPromptModal({
          channelId: body.channel?.id || '',
          userId: body.user?.id || '',
          initialRawPrompt: truncateForSlackInput(body.message?.text),
          showHelp: false,
        }),
      });
    } catch (error) {
      logger.error('Failed to open prompt coach message shortcut modal', { error: error.message });
    }
  });
}

module.exports = {
  MAX_INITIAL_PROMPT_LENGTH,
  MESSAGE_SHORTCUT_CALLBACK_ID,
  registerPromptShortcut,
  truncateForSlackInput,
};
