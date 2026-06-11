const fs = require('node:fs');
const path = require('node:path');

const FALLBACK_NO_CONTEXT_GAPS = 'No detecté contexto crítico faltante. El prompt tiene suficiente información para una primera iteración.';
const FALLBACK_STRATEGY = 'Prompt técnico estructurado con guardrails de alcance y calidad';
const FALLBACK_QUALITY_SCORE = 70;
const FALLBACK_RECOVERY_PROMPT = 'La respuesta del modelo salió incompleta y no pude recuperar un prompt confiable. Volvé a intentarlo con un prompt más corto o dividilo en partes.';

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

function normalizeScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return FALLBACK_QUALITY_SCORE;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function removeForbiddenClaims(text) {
  let safeText = normalizeText(text);
  for (const pattern of FORBIDDEN_CLAIM_PATTERNS) {
    safeText = safeText.replace(pattern, 'No asumas acceso a código, repositorios, archivos o PRs');
  }
  return safeText;
}

function decodeJsonString(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';

  try {
    return JSON.parse(`"${normalized}"`);
  } catch (_error) {
    return normalized
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
}

function findFieldStart(rawText, fieldName) {
  return String(rawText || '').indexOf(`"${fieldName}"`);
}

function findStringValueStart(rawText, fieldName) {
  const start = findFieldStart(rawText, fieldName);
  if (start < 0) return -1;

  const colonIndex = String(rawText).indexOf(':', start);
  if (colonIndex < 0) return -1;

  return String(rawText).indexOf('"', colonIndex);
}

function nextFieldBreakIndex(rawText, valueStart, fieldName) {
  const nextFieldMarkers = [
    'questions',
    'checklist',
    'strategy',
    'qualityScore',
    'detectedIssues',
    'recommendedActions',
    'prompt',
  ]
    .filter((candidate) => candidate !== fieldName)
    .map((candidate) => `"${candidate}"`);

  const endCandidates = nextFieldMarkers
    .map((marker) => String(rawText).indexOf(`,${marker}`, valueStart))
    .filter((index) => index >= 0);

  const closingBraceIndex = String(rawText).indexOf('}', valueStart);
  if (closingBraceIndex >= 0) endCandidates.push(closingBraceIndex);

  return endCandidates.length > 0 ? Math.min(...endCandidates) : -1;
}

function stripTrailingPromptArtifacts(text) {
  return String(text || '')
    .replace(/(?:\\n|\n)?text\s*$/i, '')
    .replace(/(?:\\n|\n)?[{[]\s*$/g, '')
    .trim();
}

function extractStringField(rawText, fieldName) {
  const valueStart = findStringValueStart(rawText, fieldName);
  if (valueStart < 0) return '';

  let cursor = valueStart + 1;
  let escaped = false;
  while (cursor < rawText.length) {
    const char = rawText[cursor];

    if (escaped) {
      escaped = false;
      cursor += 1;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      cursor += 1;
      continue;
    }

    if (char === '"') {
      return stripTrailingPromptArtifacts(decodeJsonString(rawText.slice(valueStart + 1, cursor)));
    }

    cursor += 1;
  }

  const breakIndex = nextFieldBreakIndex(rawText, valueStart + 1, fieldName);
  const rawValue = breakIndex >= 0
    ? rawText.slice(valueStart + 1, breakIndex)
    : rawText.slice(valueStart + 1);

  return stripTrailingPromptArtifacts(
    decodeJsonString(
      rawValue
        .replace(/",?\s*$/g, '')
        .replace(/,\s*$/g, '')
    )
  );
}

function extractArrayField(rawText, fieldName) {
  const fieldStart = findFieldStart(rawText, fieldName);
  if (fieldStart < 0) return [];

  const arrayStart = String(rawText).indexOf('[', fieldStart);
  if (arrayStart < 0) return [];

  const arrayEnd = String(rawText).indexOf(']', arrayStart);
  const rawArray = arrayEnd >= 0
    ? rawText.slice(arrayStart, arrayEnd + 1)
    : `${rawText.slice(arrayStart)}]`;

  try {
    return limitList(JSON.parse(rawArray), 3);
  } catch (_error) {
    const items = [];
    const itemPattern = /"((?:\\.|[^"\\])*)"/g;
    let match = itemPattern.exec(rawArray);
    while (match && items.length < 3) {
      const value = normalizeText(decodeJsonString(match[1]));
      if (value) items.push(value);
      match = itemPattern.exec(rawArray);
    }
    return items;
  }
}

function looksLikeRawJsonDocument(text) {
  const normalized = normalizeText(text);
  if (!normalized) return false;

  return (
    /^[{\[]/.test(normalized) ||
    /^text\s*[{\[]/i.test(normalized) ||
    /"improvedPrompt"\s*:/.test(normalized)
  );
}

function cleanRecoveredPrompt(text) {
  return removeForbiddenClaims(
    normalizeText(text)
      .replace(/^text\s*/i, '')
      .replace(/^[{[]+/, '')
      .trim()
  );
}

function recoverCoachOutput(rawText, fallback) {
  const recoveredPrompt = cleanRecoveredPrompt(
    extractStringField(rawText, 'improvedPrompt') || extractStringField(rawText, 'prompt')
  );

  if (!recoveredPrompt || looksLikeRawJsonDocument(recoveredPrompt)) {
    return {
      ...fallback,
      improvedPrompt: FALLBACK_RECOVERY_PROMPT,
    };
  }

  return {
    improvedPrompt: recoveredPrompt,
    questions: extractArrayField(rawText, 'questions'),
    checklist: extractArrayField(rawText, 'checklist'),
    strategy: normalizeText(extractStringField(rawText, 'strategy')) || FALLBACK_STRATEGY,
    qualityScore: FALLBACK_QUALITY_SCORE,
    detectedIssues: extractArrayField(rawText, 'detectedIssues'),
    recommendedActions: extractArrayField(rawText, 'recommendedActions'),
  };
}

function parseCoachOutput(rawText) {
  const fallback = {
    improvedPrompt: FALLBACK_RECOVERY_PROMPT,
    questions: [],
    checklist: ['Validá que el objetivo esté claro', 'Confirmá restricciones importantes', 'Revisá que no incluya secretos'],
    strategy: FALLBACK_STRATEGY,
    qualityScore: FALLBACK_QUALITY_SCORE,
    detectedIssues: [],
    recommendedActions: [],
  };

  try {
    const parsed = JSON.parse(rawText);
    return {
      improvedPrompt: removeForbiddenClaims(parsed.improvedPrompt || parsed.prompt || fallback.improvedPrompt),
      questions: limitList(parsed.questions, 3),
      checklist: limitList(parsed.checklist, 3),
      strategy: normalizeText(parsed.strategy) || FALLBACK_STRATEGY,
      qualityScore: normalizeScore(parsed.qualityScore),
      detectedIssues: limitList(parsed.detectedIssues, 3),
      recommendedActions: limitList(parsed.recommendedActions, 3),
    };
  } catch (_error) {
    return recoverCoachOutput(rawText, fallback);
  }
}

function buildRefinementInput({ tool, currentPrompt, refinement }) {
  return [
    `Herramienta destino: ${normalizeText(tool)}`,
    `Prompt o idea inicial del usuario: ${normalizeText(currentPrompt)}`,
    `Pedido de refinamiento: ${normalizeText(refinement)}`,
  ].join('\n');
}

function buildVariantInput({ tool, currentPrompt, variant, variantInstruction }) {
  return [
    `Herramienta destino: ${normalizeText(tool)}`,
    `Prompt o idea inicial del usuario: ${normalizeText(currentPrompt)}`,
    `Pedido de variante: ${normalizeText(variantInstruction) || normalizeText(variant)}`,
  ].join('\n');
}

function normalizeCoachResponse({ tool, ...parsed }) {
  return {
    tool: normalizeText(tool) || 'No especificada',
    improvedPrompt: removeForbiddenClaims(parsed.improvedPrompt),
    questions: limitList(parsed.questions, 3),
    checklist: limitList(parsed.checklist, 3),
    strategy: normalizeText(parsed.strategy) || FALLBACK_STRATEGY,
    qualityScore: normalizeScore(parsed.qualityScore),
    detectedIssues: limitList(parsed.detectedIssues, 3),
    recommendedActions: limitList(parsed.recommendedActions, 3),
  };
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
  detectedIssues = [],
  recommendedActions = [],
}) {
  const safePrompt = removeForbiddenClaims(improvedPrompt);
  const visibleStrategy = normalizeText(strategy) || FALLBACK_STRATEGY;
  const visibleQuestions = limitList(questions, 3);
  const visibleChecklist = limitList(checklist, 3);
  const visibleIssues = limitList(detectedIssues, 3);
  const visibleActions = limitList(recommendedActions, 3);
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
    ...(visibleIssues.length > 0 ? [
      '*Problemas detectados:*',
      visibleIssues.map((issue, index) => `${index + 1}. ${issue}`).join('\n'),
    ] : []),
    ...(visibleActions.length > 0 ? [
      '*Acciones recomendadas:*',
      visibleActions.map((action) => `* ${action}`).join('\n'),
    ] : []),
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

  async function run(input, tool) {
    const instructions = systemPrompt || readSystemPrompt();
    const rawOutput = await generateText({ instructions, input });
    const parsed = parseCoachOutput(rawOutput);
    return normalizeCoachResponse({
      tool,
      ...parsed,
    });
  }

  return {
    async generate(form) {
      return run(buildCoachInput(form), form.tool);
    },

    async improve(form) {
      return formatCoachResponse(await this.generate(form));
    },

    async refine({ tool, currentPrompt, refinement }) {
      return run(buildRefinementInput({ tool, currentPrompt, refinement }), tool);
    },

    async variant({ tool, currentPrompt, variant, variantInstruction }) {
      return run(buildVariantInput({ tool, currentPrompt, variant, variantInstruction }), tool);
    },
  };
}

module.exports = {
  FALLBACK_STRATEGY,
  FALLBACK_QUALITY_SCORE,
  FALLBACK_NO_CONTEXT_GAPS,
  FALLBACK_RECOVERY_PROMPT,
  buildCoachInput,
  buildRefinementInput,
  buildVariantInput,
  createPromptCoach,
  formatCoachResponse,
  normalizeCoachResponse,
  parseCoachOutput,
  readSystemPrompt,
  removeForbiddenClaims,
};
