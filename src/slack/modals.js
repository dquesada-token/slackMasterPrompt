const PROMPT_MODAL_CALLBACK_ID = 'prompt_coach_submission';

const BLOCK_IDS = {
  goal: 'goal_block',
  tool: 'tool_block',
  context: 'context_block',
  output: 'output_block',
  constraints: 'constraints_block',
};

const ACTION_IDS = {
  goal: 'goal_input',
  tool: 'tool_select',
  context: 'context_input',
  output: 'output_input',
  constraints: 'constraints_input',
};

const TOOL_OPTIONS = [
  'ChatGPT',
  'Codex',
  'Cursor',
  'GitHub Copilot',
  'Claude Code',
  'Lovable',
  'n8n',
  'Otra',
];

function plainText(text) {
  return { type: 'plain_text', text, emoji: true };
}

function inputBlock({ blockId, actionId, label, multiline = true }) {
  return {
    type: 'input',
    block_id: blockId,
    label: plainText(label),
    element: {
      type: 'plain_text_input',
      action_id: actionId,
      multiline,
    },
  };
}

function buildPromptModal(metadata = {}) {
  return {
    type: 'modal',
    callback_id: PROMPT_MODAL_CALLBACK_ID,
    title: plainText('Prompt Coach'),
    submit: plainText('Mejorar'),
    close: plainText('Cancelar'),
    private_metadata: JSON.stringify({
      channelId: metadata.channelId || '',
      userId: metadata.userId || '',
    }),
    blocks: [
      inputBlock({
        blockId: BLOCK_IDS.goal,
        actionId: ACTION_IDS.goal,
        label: '¿Qué querés lograr con la IA?',
      }),
      {
        type: 'input',
        block_id: BLOCK_IDS.tool,
        label: plainText('¿Qué herramienta vas a usar?'),
        element: {
          type: 'static_select',
          action_id: ACTION_IDS.tool,
          placeholder: plainText('Seleccioná una herramienta'),
          options: TOOL_OPTIONS.map((tool) => ({ text: plainText(tool), value: tool })),
        },
      },
      inputBlock({
        blockId: BLOCK_IDS.context,
        actionId: ACTION_IDS.context,
        label: '¿Qué tecnología o contexto aplica?',
      }),
      inputBlock({
        blockId: BLOCK_IDS.output,
        actionId: ACTION_IDS.output,
        label: '¿Qué salida esperás?',
      }),
      inputBlock({
        blockId: BLOCK_IDS.constraints,
        actionId: ACTION_IDS.constraints,
        label: '¿Qué NO debe hacer la IA?',
      }),
    ],
  };
}

function valueAt(values, blockId, actionId) {
  const field = values?.[blockId]?.[actionId];
  if (!field) return '';
  if (field.selected_option) return field.selected_option.value || '';
  return field.value || '';
}

function clean(value) {
  return String(value || '').trim();
}

function extractPromptSubmission(view) {
  const values = view?.state?.values || {};
  return {
    goal: clean(valueAt(values, BLOCK_IDS.goal, ACTION_IDS.goal)),
    tool: clean(valueAt(values, BLOCK_IDS.tool, ACTION_IDS.tool)),
    context: clean(valueAt(values, BLOCK_IDS.context, ACTION_IDS.context)),
    expectedOutput: clean(valueAt(values, BLOCK_IDS.output, ACTION_IDS.output)),
    constraints: clean(valueAt(values, BLOCK_IDS.constraints, ACTION_IDS.constraints)),
  };
}

module.exports = {
  ACTION_IDS,
  BLOCK_IDS,
  PROMPT_MODAL_CALLBACK_ID,
  TOOL_OPTIONS,
  buildPromptModal,
  extractPromptSubmission,
};
