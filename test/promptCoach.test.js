const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildCoachInput,
  createPromptCoach,
  formatCoachResponse,
  parseCoachOutput,
  readSystemPrompt,
} = require('../src/prompt/promptCoach');

const sampleForm = {
  goal: 'Crear pruebas unitarias para un servicio de pagos',
  tool: 'Codex',
  context: 'Node.js con node:test',
  expectedOutput: 'Plan y tests concretos',
  constraints: 'No tocar producción sin pruebas',
};

test('formatCoachResponse uses the required Slack markdown sections', () => {
  const text = formatCoachResponse({
    clarificationMode: 'coach',
    tool: 'Codex',
    improvedPrompt: 'Actúa como revisor técnico y crea pruebas primero.',
    questions: ['¿Qué módulo exacto?', '¿Qué casos borde importan?', '¿Hay mocks prohibidos?', '¿Pregunta extra?'],
    checklist: ['Confirma alcance', 'Ejecuta tests', 'Revisa secretos', 'Extra'],
    strategy: 'Scope lock + criterios de aceptación + stop conditions',
  });

  assert.match(text, /^Hola, te preparé una versión mejorada del prompt\./);
  assert.match(text, /\*Herramienta destino:\* Codex/);
  assert.doesNotMatch(text, /\*Modo:\*/);
  assert.match(text, /\*Estrategia aplicada:\* Scope lock \+ criterios de aceptación \+ stop conditions/);
  assert.match(text, /\*Prompt mejorado:\*\n\n```text\nActúa como revisor técnico/);
  assert.match(text, /\*Contexto que conviene aclarar antes de usarlo:\*/);
  assert.match(text, /1\. ¿Qué módulo exacto\?/);
  assert.match(text, /3\. ¿Hay mocks prohibidos\?/);
  assert.doesNotMatch(text, /4\. Pregunta extra/);
  assert.match(text, /\*Checklist antes de usarlo:\*/);
  assert.match(text, /\* Confirma alcance/);
  assert.match(text, /\* Revisa secretos/);
  assert.doesNotMatch(text, /\* Extra/);
});

test('formatCoachResponse prints fallback text when no critical questions exist', () => {
  const text = formatCoachResponse({
    tool: 'ChatGPT',
    improvedPrompt: 'Resume el objetivo y entrega pasos accionables.',
    questions: [],
    checklist: ['Valida contexto'],
  });

  assert.match(text, /No detecté contexto crítico faltante/);
  assert.doesNotMatch(text, /1\. /);
  assert.match(text, /\*Estrategia aplicada:\* Prompt técnico estructurado con guardrails de alcance y calidad/);
});

test('parseCoachOutput accepts JSON and removes forbidden repo-review claims', () => {
  const parsed = parseCoachOutput(JSON.stringify({
    improvedPrompt: 'Revisé el repositorio y propongo cambiar archivos.',
    questions: ['¿Cuál es el alcance?'],
    checklist: ['No pegues secretos'],
    strategy: 'Tool routing + token efficiency audit',
  }));

  assert.equal(parsed.improvedPrompt.includes('Revisé el repositorio'), false);
  assert.match(parsed.improvedPrompt, /No asumas acceso a código/);
  assert.equal(parsed.strategy, 'Tool routing + token efficiency audit');
});

test('createPromptCoach calls the generator and formats the generated result', async () => {
  const calls = [];
  const coach = createPromptCoach({
    generateText: async (request) => {
      calls.push(request);
      return JSON.stringify({
        improvedPrompt: 'Escribe un prompt claro con objetivo, contexto y restricciones.',
        questions: ['¿Cuál es el criterio de éxito?'],
        checklist: ['Incluye ejemplos', 'Aclara restricciones'],
        strategy: 'Codex routing + criterios de aceptación',
      });
    },
  });

  const response = await coach.improve(sampleForm);

  assert.equal(calls.length, 1);
  assert.doesNotMatch(calls[0].input, /Modo de comportamiento/);
  assert.doesNotMatch(calls[0].input, /Calidad esperada: alta en todos los modos/);
  assert.match(calls[0].input, /Crear pruebas unitarias/);
  assert.match(calls[0].input, /Herramienta destino: Codex/);
  assert.match(calls[0].instructions, /Slack Prompt Coach/i);
  assert.match(response, /Escribe un prompt claro/);
  assert.doesNotMatch(response, /\*Modo:\*/);
  assert.match(response, /\*Estrategia aplicada:\* Codex routing \+ criterios de aceptación/);
  assert.match(response, /¿Cuál es el criterio de éxito\?/);
});

test('readSystemPrompt loads one complete stateless development prompt', () => {
  const prompt = readSystemPrompt();

  for (const expected of [
    'Slack Prompt Coach',
    'bot stateless',
    'desarrollo de software',
    'No digás ni sugirás que revisaste código',
    'No asumas acceso a repositorios',
    'No digás que ejecutaste código',
    'No incluyás secretos',
    'No propongás GitHub API',
    '"improvedPrompt"',
    '"questions"',
    '"checklist"',
    '"strategy"',
  ]) {
    assert.match(prompt, new RegExp(expected, 'i'), `system prompt should include ${expected}`);
  }

  assert.doesNotMatch(prompt, /MODO FAST|MODO COACH|MODO STRICT/i);
});

test('system prompt adapts Prompt Master ideas without broad non-MVP claims', () => {
  const prompt = readSystemPrompt();

  for (const expected of [
    'detectar herramienta destino',
    'extraer dimensiones de intención',
    'criterios de éxito',
    'detectar anti-patrones',
    'alcance',
    'stop conditions',
    'auditar eficiencia',
    'contexto que conviene aclarar',
  ]) {
    assert.match(prompt, new RegExp(expected, 'i'), `system prompt should include ${expected}`);
  }

  for (const excluded of [
    'Lovable',
    'n8n',
    'Midjourney',
    'DALL-E',
    'video',
    'voz',
    '3D',
    'marketing',
    'memory retention',
    'Memory Block',
  ]) {
    assert.doesNotMatch(prompt, new RegExp(excluded, 'i'), `system prompt should not include ${excluded}`);
  }
});

test('createPromptCoach sends the single stateless system prompt to the generator', async () => {
  const calls = [];
  const coach = createPromptCoach({
    generateText: async (request) => {
      calls.push(request);
      return JSON.stringify({
        improvedPrompt: 'Prompt adaptado con criterio profundo por defecto.',
        questions: [],
        checklist: [],
        strategy: 'Single stateless routing',
      });
    },
  });

  await coach.improve({ ...sampleForm, clarificationMode: 'strict' });

  assert.equal(calls.length, 1);
  assert.match(calls[0].instructions, /Slack Prompt Coach/i);
  assert.doesNotMatch(calls[0].instructions, /MODO STRICT|MODO FAST|MODO COACH/i);
  assert.doesNotMatch(calls[0].input, /Modo de comportamiento/);
});

test('buildCoachInput ignores obsolete clarificationMode values', () => {
  const input = buildCoachInput({ ...sampleForm, clarificationMode: 'strict' });

  for (const expected of [
    'Objetivo: Crear pruebas unitarias',
    'Herramienta destino: Codex',
    'Tecnología o contexto: Node.js con node:test',
    'Salida esperada: Plan y tests concretos',
    'Restricciones / qué NO debe hacer la IA: No tocar producción sin pruebas',
  ]) {
    assert.match(input, new RegExp(expected, 'i'));
  }

  assert.doesNotMatch(input, /Modo de comportamiento|strict|coach|fast/i);
});

test('parseCoachOutput removes broad claims about reviewing files, repos, code, PRs or execution', () => {
  const parsed = parseCoachOutput(JSON.stringify({
    improvedPrompt: 'Ya revisé los archivos, ejecuté el código y analicé el PR. Cambiá todo.',
    questions: [],
    checklist: [],
  }));

  assert.doesNotMatch(parsed.improvedPrompt, /revis[ée] los archivos/i);
  assert.doesNotMatch(parsed.improvedPrompt, /ejecut[ée] el c[oó]digo/i);
  assert.doesNotMatch(parsed.improvedPrompt, /analic[ée] el PR/i);
  assert.match(parsed.improvedPrompt, /No asumas acceso a c[oó]digo, repositorios, archivos o PRs/i);
});
