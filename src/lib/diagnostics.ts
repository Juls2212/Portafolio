/**
 * Tiny in-memory log of errors caught in the animation code (last 10). Nothing leaves the page: it is
 * only read by the ?debug=1 overlay. Reporting must never throw.
 */
export interface LoggedError {
  at: number;
  source: string;
  message: string;
}

const MAX = 10;
const log: LoggedError[] = [];
const listeners = new Set<() => void>();

export function reportError(source: string, error: unknown) {
  try {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    // Same error repeating every frame is logged once.
    const last = log[log.length - 1];
    if (last && last.source === source && last.message === message) return;
    log.push({ at: Date.now(), source, message: message.slice(0, 300) });
    if (log.length > MAX) log.shift();
    listeners.forEach((l) => l());
  } catch {
    /* never throw from the reporter */
  }
}

export const getErrors = (): readonly LoggedError[] => log;

export function subscribeErrors(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
