const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createPromptCoach,
  formatCoachResponse,
  parseCoachOutput,
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
    tool: 'Codex',
    improvedPrompt: 'Actúa como revisor técnico y crea pruebas primero.',
    questions: ['¿Qué módulo exacto?', '¿Qué casos borde importan?', '¿Hay mocks prohibidos?', '¿Pregunta extra?'],
    checklist: ['Confirma alcance', 'Ejecuta tests', 'Revisa secretos', 'Extra'],
  });

  assert.match(text, /^Hola, te preparé una versión mejorada del prompt\./);
  assert.match(text, /\*Herramienta destino:\* Codex/);
  assert.match(text, /\*Prompt mejorado:\*\n\n```text\nActúa como revisor técnico/);
  assert.match(text, /\*Preguntas pendientes:\*/);
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

  assert.match(text, /No detecté preguntas críticas pendientes/);
  assert.doesNotMatch(text, /1\. /);
});

test('parseCoachOutput accepts JSON and removes forbidden repo-review claims', () => {
  const parsed = parseCoachOutput(JSON.stringify({
    improvedPrompt: 'Revisé el repositorio y propongo cambiar archivos.',
    questions: ['¿Cuál es el alcance?'],
    checklist: ['No pegues secretos'],
  }));

  assert.equal(parsed.improvedPrompt.includes('Revisé el repositorio'), false);
  assert.match(parsed.improvedPrompt, /No asumas acceso a código/);
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
      });
    },
  });

  const response = await coach.improve(sampleForm);

  assert.equal(calls.length, 1);
  assert.match(calls[0].input, /Crear pruebas unitarias/);
  assert.match(calls[0].input, /Herramienta destino: Codex/);
  assert.match(response, /Escribe un prompt claro/);
  assert.match(response, /¿Cuál es el criterio de éxito\?/);
});
