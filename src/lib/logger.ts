// Lightweight logger wrapper used across client code.
// - In development it prints debug/info logs.
// - In production it still prints warnings/errors but silences debug messages.

const _global: any = typeof globalThis !== 'undefined' ? globalThis : window;
const isNode = typeof (_global as any).process !== 'undefined' && typeof (_global as any).process.env !== 'undefined';
const nodeEnv = isNode ? (_global as any).process.env.NODE_ENV : undefined;

// Allow explicit runtime override via `DEBUG` (Node) or `VITE_DEBUG` (Vite)
const explicitDebug = (() => {
  try {
    if (isNode) {
      const v = (_global as any).process.env.DEBUG;
      return v === '1' || v === 'true' || v === 'yes' ? true : v === '0' || v === 'false' ? false : undefined;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = (import.meta as any)?.env?.VITE_DEBUG;
    return v === '1' || v === 'true' || v === 'yes' ? true : v === '0' || v === 'false' ? false : undefined;
  } catch (e) {
    return undefined;
  }
})();

const isDev = (() => {
  if (typeof explicitDebug === 'boolean') return explicitDebug;
  if (isNode) return nodeEnv !== 'production';
  // Vite exposes import.meta.env.DEV in the browser
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dev = (import.meta as any)?.env?.DEV;
    if (typeof dev === 'boolean') return dev;
  } catch (e) {
    // ignore
  }
  // Default to true during development builds
  return true;
})();

export function debug(...args: any[]) {
  if (!isDev) return;
  // Use console.debug when available
  // eslint-disable-next-line no-console
  console.debug('[debug]', ...args);
}

export function info(...args: any[]) {
  // eslint-disable-next-line no-console
  console.info('[info]', ...args);
}

export function warn(...args: any[]) {
  // eslint-disable-next-line no-console
  console.warn('[warn]', ...args);
}

export function error(...args: any[]) {
  // eslint-disable-next-line no-console
  console.error('[error]', ...args);
}

export default {
  debug,
  info,
  warn,
  error,
};
