/**
 * Star Leaderboard SDK
 *
 * Submit scores and display leaderboards for Star games.
 *
 * Design goals:
 * - LLM-friendly: Obvious method names, copy-paste examples
 * - Never crashes: All errors handled gracefully
 * - Dual mode: Works inside Star platform or standalone
 * - SSR-safe: No-op in server environments
 */

import { createLeaderboardImpl } from './impl';
import { isBrowser } from './utils';

export const VERSION = '0.0.1';

// ============================================================
// Types
// ============================================================

/**
 * Value type for leaderboard scores.
 * The system auto-detects this based on the game.
 */
export type ValueType = 'score' | 'time' | 'moves' | 'attempts' | 'strokes';

/**
 * Timeframe for fetching scores.
 */
export type Timeframe = 'weekly' | 'all_time';

/**
 * Configuration for the leaderboard SDK.
 */
export interface LeaderboardOptions {
  /**
   * Game ID for leaderboard. If not provided, auto-detected when available.
   */
  gameId?: string;

  /**
   * API base URL. Auto-configured; only override for custom deployments.
   */
  apiBase?: string;
}

/**
 * Result of submitting a score.
 */
export interface SubmitResult {
  /** Whether the submission succeeded */
  success: boolean;
  /** Player's rank on the leaderboard (1 = first place) */
  rank?: number;
  /** Unique ID of the submitted score */
  scoreId?: string;
  /** Error message if submission failed */
  error?: string;
}

/**
 * A single score entry on the leaderboard.
 */
export interface ScoreEntry {
  /** Unique ID of the score */
  id: string;
  /** Player's display name */
  playerName: string | null;
  /** The score value */
  score: number;
  /** Player's rank (1 = first place) */
  rank: number;
  /** ISO timestamp when score was submitted */
  submittedAt: string;
}

/** Alias for ScoreEntry - for LLM discoverability */
export type LeaderboardScore = ScoreEntry;

/**
 * Configuration for the leaderboard (auto-detected by AI).
 */
export interface LeaderboardConfig {
  /** Sort order: DESC for "higher is better", ASC for "lower is better" */
  sort?: 'ASC' | 'DESC';
  /** Type of value being tracked */
  valueType?: ValueType;
}

/**
 * Full leaderboard data payload.
 */
export interface LeaderboardData {
  /** Top scores */
  scores: ScoreEntry[];
  /** Leaderboard configuration */
  config?: LeaderboardConfig;
  /** Current timeframe */
  timeframe: Timeframe;
  /** Current user's score (if outside top scores) */
  you?: ScoreEntry | null;
  /** Unix timestamp (ms) when weekly leaderboard resets */
  weekResetTime?: number | null;
}

/**
 * Options for fetching scores.
 */
export interface GetScoresOptions {
  /** Time period: 'weekly' (default) or 'all_time' */
  timeframe?: Timeframe;
  /** Maximum scores to return (default: 10) */
  limit?: number;
}

/**
 * Options for submitting a score.
 */
export interface SubmitScoreOptions {
  /**
   * Custom player name for this score.
   * If not provided, a persistent guest name (Player-XXXX) will be used.
   */
  playerName?: string;
}

/**
 * Options for sharing the leaderboard.
 */
export interface ShareOptions {
  /** Game title for the share card */
  gameTitle?: string;
  /** Score to highlight */
  score?: number;
  /** Player name to display */
  playerName?: string;
}

/**
 * Result of generating a share link.
 */
export interface ShareResult {
  /** Whether share link was generated */
  success: boolean;
  /** Shareable URL */
  shareUrl?: string;
  /** Error message if failed */
  error?: string;
}

/**
 * The main Star Leaderboard SDK interface.
 */
export interface StarLeaderboard {
  /** Whether the SDK is ready to use */
  readonly ready: boolean;
  /** Current game ID */
  readonly gameId: string | null;

  /**
   * Submit a score to the leaderboard.
   *
   * @param score - The score value to submit
   * @param options - Optional submit options (custom player name)
   * @returns Result with success status and rank
   *
   * @example
   * ```javascript
   * const { success, rank } = await leaderboard.submit(1250);
   * if (success) console.log(`You're ranked #${rank}!`);
   * ```
   *
   * @example Custom player name
   * ```javascript
   * await leaderboard.submit(1250, { playerName: 'Alice' });
   * ```
   */
  submit(score: number, options?: SubmitScoreOptions): Promise<SubmitResult>;

  /**
   * Fetch leaderboard scores.
   *
   * @param options - Fetch options (timeframe, limit)
   * @returns Leaderboard data with scores
   *
   * @example
   * ```javascript
   * const { scores, you } = await leaderboard.getScores({ timeframe: 'weekly' });
   * scores.forEach(s => console.log(`#${s.rank} ${s.playerName}: ${s.score}`));
   * ```
   */
  getScores(options?: GetScoresOptions): Promise<LeaderboardData>;

  /**
   * Show the leaderboard UI.
   *
   * @example
   * ```javascript
   * // After game over
   * leaderboard.submit(score);
   * leaderboard.show();
   * ```
   */
  show(): void;

  /**
   * Generate a shareable link for the leaderboard.
   *
   * @param options - Share options
   * @returns Result with shareable URL
   *
   * @example
   * ```javascript
   * const { shareUrl } = await leaderboard.share({ score: 1250 });
   * navigator.share?.({ url: shareUrl });
   * ```
   */
  share(options?: ShareOptions): Promise<ShareResult>;

  /** Alias for submit() - for LLM discoverability */
  submitScore: StarLeaderboard['submit'];

  /** Alias for show() - for LLM discoverability */
  showLeaderboard: StarLeaderboard['show'];

  /**
   * Subscribe to score submission results.
   *
   * @param fn - Callback function
   * @returns Unsubscribe function
   */
  onSubmit(fn: (result: SubmitResult) => void): () => void;

  /**
   * Clean up SDK resources.
   */
  destroy(): void;
}

// ============================================================
// SSR Stub
// ============================================================

function createSSRStub(): StarLeaderboard {
  const noop = () => {};
  const noopAsync = <T>(value: T) => () => Promise.resolve(value);

  return {
    ready: false,
    gameId: null,
    submit: noopAsync({ success: false, error: 'SSR environment' }),
    getScores: noopAsync({ scores: [], timeframe: 'weekly' as Timeframe, you: null }),
    show: noop,
    share: noopAsync({ success: false, error: 'SSR environment' }),
    get submitScore() {
      return this.submit;
    },
    get showLeaderboard() {
      return this.show;
    },
    onSubmit: () => noop,
    destroy: noop,
  };
}

// ============================================================
// Factory Function
// ============================================================

/**
 * Creates a Star Leaderboard SDK instance.
 * The gameId must come from running `npx star-sdk init` (saved in .starrc).
 * Do not invent a gameId — it is a server-issued token.
 *
 * @param options - Configuration options (gameId from .starrc is required)
 * @returns StarLeaderboard instance
 *
 * @example
 * ```javascript
 * import { createLeaderboard } from 'star-leaderboard';
 *
 * // First run: npx star-sdk init "My Game"
 * // Then use the gameId from the created .starrc file:
 * const leaderboard = createLeaderboard({ gameId: '<gameId from .starrc>' });
 *
 * // Submit a score when game ends
 * await leaderboard.submit(1250);
 *
 * // Show the leaderboard UI
 * leaderboard.show();
 * ```
 */
export function createLeaderboard(options?: LeaderboardOptions): StarLeaderboard {
  if (!isBrowser()) {
    return createSSRStub();
  }
  return createLeaderboardImpl(options);
}

export default createLeaderboard;
