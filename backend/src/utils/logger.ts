import { config } from '../config';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const logLevels: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const currentLevel = logLevels[config.logging.level as LogLevel] || logLevels.info;

export const logger = {
  error: (message: string, meta?: unknown) => {
    if (currentLevel >= logLevels.error) {
      console.error(`[ERROR] ${message}`, meta || '');
    }
  },
  warn: (message: string, meta?: unknown) => {
    if (currentLevel >= logLevels.warn) {
      console.warn(`[WARN] ${message}`, meta || '');
    }
  },
  info: (message: string, meta?: unknown) => {
    if (currentLevel >= logLevels.info) {
      console.log(`[INFO] ${message}`, meta || '');
    }
  },
  debug: (message: string, meta?: unknown) => {
    if (currentLevel >= logLevels.debug) {
      console.log(`[DEBUG] ${message}`, meta || '');
    }
  },
};
