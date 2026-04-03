/**
 * Star Debug Mode — lightweight, self-contained module.
 * No dependencies on audio, canvas, leaderboard, or multiplayer.
 *
 * On the Star platform, debug mode is toggled via Tools menu or Cmd+Shift+D.
 * During local development (localhost), Cmd+Shift+D toggles it directly.
 *
 * @example
 * ```javascript
 * import { debug } from '/star-sdk/v1/debug.js';
 *
 * if (debug.enabled) {
 *   // render debug panel
 * }
 *
 * debug.onChange((on) => {
 *   debugPanel.style.display = on ? 'block' : 'none';
 * });
 * ```
 */

declare global {
  interface Window {
    __STAR_DEBUG__?: boolean;
  }
}

const isBrowser = () => typeof window !== 'undefined';

export const debug = {
  get enabled(): boolean { return !!(isBrowser() && window.__STAR_DEBUG__); },
  set enabled(_: boolean) { /* read-only — use platform toggle or Cmd+Shift+D */ },
  onChange(callback: (enabled: boolean) => void): () => void {
    if (!isBrowser()) return () => {};
    const handler = () => callback(!!window.__STAR_DEBUG__);
    window.addEventListener('star_debug_mode_changed', handler);
    return () => window.removeEventListener('star_debug_mode_changed', handler);
  },
};

// Keyboard shortcut on localhost (outside Star iframes — the platform's
// injected script handles the shortcut inside iframes via star_debug_shortcut_enabled)
if (isBrowser()) {
  const host = window.location?.hostname;
  const inIframe = window.parent !== window;
  if ((host === 'localhost' || host === '127.0.0.1') && !inIframe) {
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        window.__STAR_DEBUG__ = !window.__STAR_DEBUG__;
        window.dispatchEvent(new Event('star_debug_mode_changed'));
      }
    });
  }
}

export default { debug };
