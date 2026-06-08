const crypto = require('node:crypto');

const DEFAULT_TTL_MS = 15 * 60 * 1000;
const cache = new Map();

function now() {
  return Date.now();
}

function normalizeText(value) {
  return String(value || '').trim();
}

function cleanupExpired(currentTime = now()) {
  for (const [id, entry] of cache.entries()) {
    if (entry.expiresAt <= currentTime) {
      cache.delete(id);
    }
  }
}

function savePromptContext({ tool, currentPrompt }, options = {}) {
  cleanupExpired();
  const cleanPrompt = normalizeText(currentPrompt);
  if (!cleanPrompt) return '';

  const id = crypto.randomUUID();
  cache.set(id, {
    tool: normalizeText(tool) || 'No especificada',
    currentPrompt: cleanPrompt,
    expiresAt: now() + (options.ttlMs || DEFAULT_TTL_MS),
  });
  return id;
}

function getPromptContext(id) {
  cleanupExpired();
  const entry = cache.get(normalizeText(id));
  if (!entry) return { tool: '', currentPrompt: '' };
  return {
    tool: entry.tool,
    currentPrompt: entry.currentPrompt,
  };
}

function clearPromptContextCache() {
  cache.clear();
}

module.exports = {
  DEFAULT_TTL_MS,
  clearPromptContextCache,
  getPromptContext,
  savePromptContext,
};
