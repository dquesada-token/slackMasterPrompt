const fs = require('node:fs');
const path = require('node:path');

const FALLBACK_NO_CONTEXT_GAPS = 'No detecté contexto crítico faltante. El prompt tiene suficiente información para una primera iteración.';
const FALLBACK_STRATEGY = 'Prompt técnico estructurado con guardrails de alcance y calidad';

const FORBIDDEN_CLAIM_PATTERNS = [
  /(?:ya\s+)?revis[ée]\s+(?:el|la|los|las)?\s*(c[oó]digo|repositorio|repo|pull request|pr|archivo|archivos)/gi,
  /(?:ya\s+)?analic[ée]\s+(?:el|la|los|las)?\s*(c[oó]digo|repositorio|repo|pull request|pr|archivo|archivos)/gi,
  /(?:ya\s+)?acced[íi]\s+(?:al|a los?|a las?)\s*(repositorio|repo|archivos|pr|pull request)/gi,
  /(?:ya\s+)?ejecut[ée]\s+(?:el|la)?\s*(c[oó]digo|comando|script|test|tests)/gi,
];

function normalizeText(value) {
  return String(value || '').trim();
}

function readSystemPrompt() {
  return fs.readFileSync(path.join(__dirname, 'system-prompt.md'), 'utf8');
}

function limitList(values, maxItems) {
  if (!Array.isArray(values)) return [];
  return values
    .map(normalizeText)
    .filter(Boolean)
    .slice(0, maxItems);
}

function removeForbiddenClaims(text) {
  let safeText = normalizeText(text);
  for (const pattern of FORBIDDEN_CLAIM_PATTERNS) {
    safeText = safeText.replace(pattern, 'No asumas acceso a código, repositorios, archivos o PRs');
  }
  return safeText;
}

function parseCoachOutput(rawText) {
  const fallback = {
    improvedPrompt: removeForbiddenClaims(rawText),
    questions: [],
    checklist: ['Validá que el objetivo esté claro', 'Confirmá restricciones importantes', 'Revisá que no incluya secretos'],
    strategy: FALLBACK_STRATEGY,
  };

  try {
    const parsed = JSON.parse(rawText);
    return {
      improvedPrompt: removeForbiddenClaims(parsed.improvedPrompt || parsed.prompt || fallback.improvedPrompt),
      questions: limitList(parsed.questions, 3),
      checklist: limitList(parsed.checklist, 3),
      strategy: normalizeText(parsed.strategy) || FALLBACK_STRATEGY,
    };
  } catch (_error) {
    return fallback;
  }
}

function buildCoachInput(form) {
  return [
    `Herramienta destino: ${normalizeText(form.tool)}`,
    `Prompt o idea inicial del usuario: ${normalizeText(form.rawPrompt)}`,
  ].join('\n');
}

function formatCoachResponse({
  tool,
  improvedPrompt,
  questions = [],
  checklist = [],
  strategy,
}) {
  const safePrompt = removeForbiddenClaims(improvedPrompt);
  const visibleStrategy = normalizeText(strategy) || FALLBACK_STRATEGY;
  const visibleQuestions = limitList(questions, 3);
  const visibleChecklist = limitList(checklist, 3);
  const questionText = visibleQuestions.length > 0
    ? visibleQuestions.map((question, index) => `${index + 1}. ${question}`).join('\n')
    : FALLBACK_NO_CONTEXT_GAPS;
  const checklistText = visibleChecklist.length > 0
    ? visibleChecklist.map((item) => `* ${item}`).join('\n')
    : '* Validá que el prompt tenga objetivo, contexto y restricciones';

  return [
    'Hola, te preparé una versión mejorada del prompt.',
    '',
    `*Herramienta destino:* ${normalizeText(tool) || 'No especificada'}`,
    `*Estrategia aplicada:* ${visibleStrategy}`,
    '',
    '*Prompt mejorado:*',
    '',
    '```text',
    safePrompt || 'Necesito más contexto para generar un prompt útil.',
    '```',
    '',
    '*Contexto que conviene aclarar antes de usarlo:*',
    '',
    questionText,
    '',
    '*Checklist antes de usarlo:*',
    '',
    checklistText,
  ].join('\n');
}

function createPromptCoach({ generateText, systemPrompt } = {}) {
  if (typeof generateText !== 'function') {
    throw new Error('createPromptCoach requires a generateText function');
  }

  return {
    async improve(form) {
      const input = buildCoachInput(form);
      const instructions = systemPrompt || readSystemPrompt();
      const rawOutput = await generateText({ instructions, input });
      const parsed = parseCoachOutput(rawOutput);
      return formatCoachResponse({
        tool: form.tool,
        ...parsed,
      });
    },
  };
}

module.exports = {
  FALLBACK_STRATEGY,
  FALLBACK_NO_CONTEXT_GAPS,
  buildCoachInput,
  createPromptCoach,
  formatCoachResponse,
  parseCoachOutput,
  readSystemPrompt,
  removeForbiddenClaims,
};
