/**
 * Platform postMessage bridge for communication with Star platform parent
 */

import type { SubmitResult } from './index';

const SDK_SOURCE = 'star_leaderboard_sdk';
const PARENT_SOURCE = 'star_leaderboard_parent';
const RUNTIME_SOURCE = 'star_game_runtime';

export interface PlatformBridge {
  readonly gameId: string | null;
  readonly ready: boolean;
  submit(score: number): Promise<SubmitResult>;
  show(): void;
  destroy(): void;
}

interface PendingSubmit {
  resolve: (result: SubmitResult) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

/**
 * Creates a platform bridge that communicates with the Star parent window
 * via postMessage.
 */
export function createPlatformBridge(): PlatformBridge {
  let gameId: string | null = null;
  let ready = false;
  let submitId = 0;
  const pendingSubmits = new Map<number, PendingSubmit>();

  function postToParent(type: string, payload?: unknown): void {
    try {
      window.parent.postMessage({ source: SDK_SOURCE, type, payload }, '*');
    } catch {
      // Silently fail if parent is inaccessible
    }
  }

  // Also support sending via the runtime source for compatibility with existing handlers
  function postToParentRuntime(type: string, payload?: unknown): void {
    try {
      window.parent.postMessage({ source: RUNTIME_SOURCE, type, payload }, '*');
    } catch {
      // Silently fail if parent is inaccessible
    }
  }

  function handleMessage(event: MessageEvent): void {
    if (!event.data || typeof event.data !== 'object') return;

    const { source, type, payload } = event.data;

    // Handle messages from Star platform parent
    if (source === PARENT_SOURCE) {
      switch (type) {
        case 'context':
          if (payload?.gameId) {
            gameId = payload.gameId;
            ready = true;
          }
          break;

        case 'submit_result': {
          const id = payload?.id;
          const pending = pendingSubmits.get(id);
          if (pending) {
            clearTimeout(pending.timeoutId);
            pendingSubmits.delete(id);
            pending.resolve({
              success: payload?.success ?? false,
              rank: payload?.rank,
              scoreId: payload?.scoreId,
              error: payload?.error,
            });
          }
          break;
        }
      }
    }
  }

  // Start listening for messages
  window.addEventListener('message', handleMessage);

  // Request context from parent
  postToParent('request_context');

  return {
    get gameId() {
      return gameId;
    },

    get ready() {
      return ready;
    },

    async submit(score: number): Promise<SubmitResult> {
      const id = ++submitId;

      return new Promise((resolve) => {
        // Set up timeout - return failure if no response after 10s
        const timeoutId = setTimeout(() => {
          if (pendingSubmits.has(id)) {
            pendingSubmits.delete(id);
            resolve({ success: false, error: 'Timeout waiting for response' });
          }
        }, 10000);

        pendingSubmits.set(id, { resolve, timeoutId });

        // Send via SDK source for async response
        // GamePlayer.tsx handles this and calls the backend
        postToParent('submit_score', { id, score });
      });
    },

    show(): void {
      // Use the runtime source which the platform already handles
      postToParentRuntime('star_show_leaderboard');
    },

    destroy(): void {
      window.removeEventListener('message', handleMessage);
      // Resolve all pending submits to prevent hanging promises
      for (const [id, pending] of pendingSubmits) {
        clearTimeout(pending.timeoutId);
        pending.resolve({ success: false, error: 'SDK destroyed' });
      }
      pendingSubmits.clear();
    },
  };
}
