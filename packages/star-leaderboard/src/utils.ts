/**
 * SSR safety and utility helpers
 */

/** Check if we're in a browser environment */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/** Safe console.warn that won't throw in SSR */
export function warn(message: string, ...args: unknown[]): void {
  if (isBrowser() && typeof console !== 'undefined') {
    console.warn(`[star-leaderboard] ${message}`, ...args);
  }
}

/** Safe console.error that won't throw in SSR */
export function error(message: string, ...args: unknown[]): void {
  if (isBrowser() && typeof console !== 'undefined') {
    console.error(`[star-leaderboard] ${message}`, ...args);
  }
}
