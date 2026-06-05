const LEVELS = ['debug', 'info', 'warn', 'error'];

function createLogger(level = 'info') {
  const minIndex = LEVELS.includes(level) ? LEVELS.indexOf(level) : LEVELS.indexOf('info');

  return LEVELS.reduce((logger, currentLevel, index) => {
    logger[currentLevel] = (message, metadata = {}) => {
      if (index < minIndex) return;
      const safeMetadata = Object.fromEntries(
        Object.entries(metadata).filter(([key]) => !/token|secret|key/i.test(key))
      );
      console[currentLevel === 'debug' ? 'log' : currentLevel](message, safeMetadata);
    };
    return logger;
  }, {});
}

module.exports = { createLogger };
