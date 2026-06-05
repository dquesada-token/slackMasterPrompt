const fs = require('node:fs');
const path = require('node:path');

const FALLBACK_NO_QUESTIONS = 'No detecté preguntas críticas pendientes. El prompt ya tiene suficiente contexto para una primera iteración.';
const FORBIDDEN_CLAIM_PATTERNS = [
  /revis[ée] (el )?(c[oó]digo|repositorio|repo|pull request|pr|archivo|archivos)/gi,
  /analic[ée] (el )?(c[oó]digo|repositorio|repo|pull request|pr|archivo|archivos)/gi,
  /acced[íi] (al|a los?) (repositorio|repo|archivos|pr|pull request)/gi,
];

function readSystemPrompt() {
  return fs.readFileSync(path.join(__dirname, 'system-prompt.md'), 'utf8');
}

function normalizeText(value) {
  return String(value || '').trim();
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
  };

  try {
    const parsed = JSON.parse(rawText);
    return {
      improvedPrompt: removeForbiddenClaims(parsed.improvedPrompt || parsed.prompt || fallback.improvedPrompt),
      questions: limitList(parsed.questions, 3),
      checklist: limitList(parsed.checklist, 3),
    };
  } catch (_error) {
    return fallback;
  }
}

function buildCoachInput(form) {
  return [
    `Objetivo: ${normalizeText(form.goal)}`,
    `Herramienta destino: ${normalizeText(form.tool)}`,
    `Tecnología o contexto: ${normalizeText(form.context)}`,
    `Salida esperada: ${normalizeText(form.expectedOutput)}`,
    `Restricciones / qué NO debe hacer la IA: ${normalizeText(form.constraints)}`,
  ].join('\n');
}

function formatCoachResponse({ tool, improvedPrompt, questions = [], checklist = [] }) {
  const safePrompt = removeForbiddenClaims(improvedPrompt);
  const visibleQuestions = limitList(questions, 3);
  const visibleChecklist = limitList(checklist, 3);
  const questionText = visibleQuestions.length > 0
    ? visibleQuestions.map((question, index) => `${index + 1}. ${question}`).join('\n')
    : FALLBACK_NO_QUESTIONS;
  const checklistText = visibleChecklist.length > 0
    ? visibleChecklist.map((item) => `* ${item}`).join('\n')
    : '* Validá que el prompt tenga objetivo, contexto y restricciones';

  return [
    'Hola, te preparé una versión mejorada del prompt.',
    '',
    `*Herramienta destino:* ${normalizeText(tool) || 'No especificada'}`,
    '',
    '*Prompt mejorado:*',
    '',
    '```text',
    safePrompt || 'Necesito más contexto para generar un prompt útil.',
    '```',
    '',
    '*Preguntas pendientes:*',
    '',
    questionText,
    '',
    '*Checklist antes de usarlo:*',
    '',
    checklistText,
  ].join('\n');
}

function createPromptCoach({ generateText, systemPrompt = readSystemPrompt() }) {
  if (typeof generateText !== 'function') {
    throw new Error('createPromptCoach requires a generateText function');
  }

  return {
    async improve(form) {
      const input = buildCoachInput(form);
      const rawOutput = await generateText({ instructions: systemPrompt, input });
      const parsed = parseCoachOutput(rawOutput);
      return formatCoachResponse({ tool: form.tool, ...parsed });
    },
  };
}

module.exports = {
  FALLBACK_NO_QUESTIONS,
  buildCoachInput,
  createPromptCoach,
  formatCoachResponse,
  parseCoachOutput,
  removeForbiddenClaims,
};
