/**
 * Core implementation of the Star Leaderboard SDK
 */

import type {
  StarLeaderboard,
  LeaderboardOptions,
  SubmitResult,
  LeaderboardData,
  GetScoresOptions,
  ShareOptions,
  ShareResult,
  SubmitScoreOptions,
} from './index';
import { createPlatformBridge, type PlatformBridge } from './platform';
import { createApiClient, type ApiClient } from './api';
import { warn, error } from './utils';
import { showFallbackUI } from './fallback-ui';

const PLAYER_ID_STORAGE_KEY = 'star-player-id';

/**
 * Gets or creates a persistent player ID stored in localStorage.
 * Returns null if localStorage is unavailable.
 */
function getOrCreatePlayerId(): string | null {
  try {
    let id = localStorage.getItem(PLAYER_ID_STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(PLAYER_ID_STORAGE_KEY, id);
    }
    return id;
  } catch {
    // localStorage may be unavailable (private browsing, etc.)
    return null;
  }
}

/**
 * Gets the default player name derived from the persistent player ID.
 * Format: "Player-XXXX" where XXXX is the last 4 characters of the UUID.
 */
function getDefaultPlayerName(): string | null {
  const id = getOrCreatePlayerId();
  return id ? `Player-${id.slice(-4)}` : null;
}

type SubmitHandler = (result: SubmitResult) => void;

/**
 * Detects if we're running inside the Star platform iframe.
 * Checks for the existence of the injected global functions.
 */
function detectPlatformContext(): boolean {
  try {
    // Check if we're in an iframe
    if (window.parent === window) {
      return false;
    }
    // Check if the platform has injected the global functions
    return typeof (window as unknown as { submitStarScore?: unknown }).submitStarScore === 'function';
  } catch {
    return false;
  }
}

/**
 * Creates the Star Leaderboard SDK implementation.
 */
export function createLeaderboardImpl(options: LeaderboardOptions = {}): StarLeaderboard {
  const isPlatform = detectPlatformContext();
  const explicitGameId = options.gameId ?? null;
  const apiBase = options.apiBase ?? (isPlatform ? '' : 'https://buildwithstar.com');
  const sortPreference = options.sort ?? null;

  let platformBridge: PlatformBridge | null = null;
  let apiClient: ApiClient | null = null;
  const submitHandlers = new Set<SubmitHandler>();
  let lastSubmittedScore: number | undefined;

  // Initialize based on mode
  if (isPlatform) {
    platformBridge = createPlatformBridge();
  } else {
    apiClient = createApiClient(apiBase);
  }

  function getGameId(): string | null {
    return explicitGameId ?? platformBridge?.gameId ?? null;
  }

  const instance: StarLeaderboard = {
    get ready() {
      if (isPlatform) {
        return platformBridge?.ready ?? false;
      }
      return explicitGameId !== null;
    },

    get gameId() {
      return getGameId();
    },

    async submit(score: number, options?: SubmitScoreOptions): Promise<SubmitResult> {
      if (typeof score !== 'number' || !isFinite(score)) {
        warn('Invalid score value:', score);
        return { success: false, error: 'Invalid score value' };
      }

      try {
        let result: SubmitResult;

        if (isPlatform && platformBridge) {
          result = await platformBridge.submit(score);
        } else if (apiClient) {
          const gid = getGameId();
          if (!gid) {
            error('gameId is required. Run "npx star-sdk init" to register your game and get a gameId.');
            return { success: false, error: 'gameId is required. Run "npx star-sdk init" to register your game.' };
          }
          // Use custom playerName if provided, otherwise use persistent default
          const playerName = options?.playerName || getDefaultPlayerName() || undefined;
          result = await apiClient.submit(gid, score, { playerName, sort: sortPreference ?? undefined });
        } else {
          return { success: false, error: 'Not initialized' };
        }

        // Notify handlers
        for (const handler of submitHandlers) {
          try {
            handler(result);
          } catch (e) {
            error('Submit handler error:', e);
          }
        }

        return result;
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : 'Unknown error';
        error('Failed to submit score:', e);
        return { success: false, error: errMsg };
      }
    },

    async getScores(opts: GetScoresOptions = {}): Promise<LeaderboardData> {
      const gid = getGameId();

      if (!gid) {
        error('gameId is required to fetch scores. Run "npx star-sdk init" to register your game and get a gameId.');
        return {
          scores: [],
          timeframe: opts.timeframe ?? 'weekly',
          you: null,
        };
      }

      if (!apiClient) {
        // Create a temporary client for platform mode if needed
        apiClient = createApiClient(apiBase);
      }

      // Pass playerName to enable guest "you" matching
      const playerName = getDefaultPlayerName() || undefined;
      return apiClient.getScores(gid, { ...opts, playerName });
    },

    show(): void {
      if (isPlatform && platformBridge) {
        platformBridge.show();
      } else {
        // Show fallback UI for local development
        showFallbackUI({
          gameId: getGameId(),
          getScores: instance.getScores.bind(instance),
        });
      }
    },

    async share(opts: ShareOptions = {}): Promise<ShareResult> {
      const gid = getGameId();

      if (!gid) {
        error('gameId is required for sharing. Run "npx star-sdk init" to register your game and get a gameId.');
        return { success: false, error: 'gameId is required. Run "npx star-sdk init" to register your game.' };
      }

      if (!apiClient) {
        apiClient = createApiClient(apiBase);
      }

      try {
        return await apiClient.share(gid, opts);
      } catch (e) {
        error('Failed to generate share link:', e);
        return {
          success: false,
          error: e instanceof Error ? e.message : 'Unknown error',
        };
      }
    },

    // Aliases for LLM discoverability
    get submitScore() {
      return instance.submit;
    },

    get showLeaderboard() {
      return instance.show;
    },

    onSubmit(fn: SubmitHandler): () => void {
      submitHandlers.add(fn);
      return () => {
        submitHandlers.delete(fn);
      };
    },

    destroy(): void {
      if (platformBridge) {
        platformBridge.destroy();
        platformBridge = null;
      }
      submitHandlers.clear();
    },
  };

  return instance;
}
