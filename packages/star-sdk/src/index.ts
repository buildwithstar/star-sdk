/**
 * Star SDK - Unified namespace for game development
 *
 * Provides a single import for all Star features:
 * - Audio: Procedural sounds and music management
 * - Canvas: Game loop, input handling, rendering
 * - Leaderboard: Score submission and display
 * - Multiplayer: Real-time game state sync
 *
 * @example
 * ```javascript
 * import Star from 'star-sdk';
 * Star.init({ gameId: '<gameId from .starrc>' });
 *
 * Star.audio.play('coin');
 * Star.game(ctx => { ... });
 * Star.leaderboard.submit(1500);
 * Star.leaderboard.show();
 * ```
 */

import type { StarAudioOptions, Manifest, PlayOptions } from 'star-audio';
import type { GetScoresOptions, ShareOptions } from 'star-leaderboard';
import type { GameContext, GameOptions } from 'star-canvas';
import type { StartOptions as MultiplayerOptions } from 'star-multiplayer';

// Static imports for ESM compatibility (bundlers handle tree-shaking)
import { createStarAudio, type StarAudio } from 'star-audio';
import { createLeaderboard, type StarLeaderboard } from 'star-leaderboard';
import { game as starGame } from 'star-canvas';
import { createMultiplayer, type StarMultiplayer } from 'star-multiplayer';

// NOTE: star-payments is not yet published with real exports.
// Re-export once star-payments ships a proper build.
// export { createPayments, type StarPayments, type Product, type PromptResult } from 'star-payments';

// ============================================================
// State
// ============================================================

let _initOptions: { gameId: string; apiBase?: string } | null = null;
let _audio: StarAudio | null = null;
let _leaderboard: StarLeaderboard | null = null;

const isBrowser = () => typeof window !== 'undefined';
const isNode = () => typeof process !== 'undefined' && process.versions?.node;

// ============================================================
// Config Loading
// ============================================================

interface StarConfig {
  gameId: string;
  name?: string;
  email?: string;
  dashboardUrl?: string;
}

/**
 * Load configuration from .starrc file (Node.js only).
 * Returns null in browser or if file doesn't exist.
 */
function loadConfigFromFile(): StarConfig | null {
  if (isBrowser() || !isNode()) return null;

  try {
    // Dynamic require to avoid bundling Node.js modules in browser builds
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(process.cwd(), '.starrc');

    if (!fs.existsSync(configPath)) return null;

    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

// ============================================================
// Lazy Initialization
// ============================================================

/**
 * Get or create the audio manager (lazy).
 */
function getAudio(): StarAudio {
  if (!_audio && isBrowser()) {
    _audio = createStarAudio();
  }
  return _audio!;
}

// Default API base for standalone mode (outside Star platform)
const DEFAULT_API_BASE = 'https://buildwithstar.com';

/**
 * Get or create the leaderboard client (lazy).
 * Will auto-load from .starrc if available in Node.js and no init options set.
 */
function getLeaderboard(): StarLeaderboard {
  if (!_leaderboard) {
    // Try to auto-load config from .starrc if not initialized
    let gameId = _initOptions?.gameId;
    let apiBase = _initOptions?.apiBase ?? DEFAULT_API_BASE;

    if (!gameId) {
      const config = loadConfigFromFile();
      if (config?.gameId) {
        gameId = config.gameId;
      }
    }

    _leaderboard = createLeaderboard({ gameId, apiBase });
  }
  return _leaderboard!;
}

// ============================================================
// Star Namespace
// ============================================================

const Star = {
  /**
   * Initialize with your game config.
   * The gameId must come from running `npx star-sdk init` (saved in .starrc).
   * Do not invent a gameId — it is a server-issued token.
   *
   * @param options - Configuration with gameId from .starrc and optional apiBase
   *
   * @example
   * ```javascript
   * // First run: npx star-sdk init "My Game"
   * // Then use the gameId from the created .starrc file:
   * Star.init({ gameId: '<gameId from .starrc>' });
   * ```
   */
  init(options: { gameId: string; apiBase?: string }) {
    _initOptions = options;
    // Reset leaderboard so it picks up new options
    if (_leaderboard) {
      _leaderboard.destroy?.();
      _leaderboard = null;
    }
  },

  /**
   * Audio manager - procedural sounds and music.
   *
   * @example
   * ```javascript
   * Star.audio.play('coin');
   * Star.audio.music.crossfadeTo('level2');
   * ```
   */
  audio: {
    play: (id: string, opts?: PlayOptions) => getAudio().play(id, opts),
    preload: (manifest: Manifest) => getAudio().preload(manifest),
    music: {
      crossfadeTo: (id: string, opts?: { duration?: number; loop?: boolean }) =>
        getAudio().music.crossfadeTo(id, opts),
      stop: (fadeSec?: number) => getAudio().music.stop(fadeSec),
    },
    setMusicVolume: (v: number) => getAudio().setMusicVolume(v),
    setSfxVolume: (v: number) => getAudio().setSfxVolume(v),
    setMute: (m: boolean) => getAudio().setMute(m),
    toggleMute: () => getAudio().toggleMute(),
    isMuted: () => getAudio().isMuted(),
  },

  /**
   * Initialize the game canvas and context.
   * Handles DOM timing, DPR scaling, and provides a game loop.
   *
   * @param setup - Function called when canvas is ready
   * @param options - Canvas and stage configuration
   *
   * @example
   * ```javascript
   * Star.game(ctx => {
   *   const { canvas, width, height } = ctx;
   *
   *   ctx.loop((dt) => {
   *     ctx.ctx.fillStyle = '#000';
   *     ctx.ctx.fillRect(0, 0, width, height);
   *   });
   * });
   * ```
   */
  game(setup: (g: GameContext) => void, options?: GameOptions) {
    starGame(setup, options);
  },

  /**
   * Leaderboard - submit scores and display rankings.
   * Requires `Star.init({ gameId })` to be called first.
   *
   * @example
   * ```javascript
   * Star.init({ gameId: '<gameId from .starrc>' });
   * await Star.leaderboard.submit(1500);
   * Star.leaderboard.show();
   * ```
   */
  leaderboard: {
    submit: (score: number) => getLeaderboard().submit(score),
    show: () => getLeaderboard().show(),
    getScores: (opts?: GetScoresOptions) => getLeaderboard().getScores(opts),
    share: (opts?: ShareOptions) => getLeaderboard().share(opts),
  },

  /**
   * Multiplayer - real-time game state synchronization.
   *
   * @example
   * ```javascript
   * const mp = await Star.multiplayer.create({ maxPlayers: 4 });
   *
   * mp.onState(state => { gameState = state; });
   * mp.onInput((id, input) => { state.players[id].y = input.y; });
   *
   * ctx.loop((dt) => {
   *   mp.hostTick(dt, () => { updatePhysics(dt); return state; });
   *   render(state);
   * });
   *
   * canvas.onpointermove = (e) => mp.input({ y: e.clientY });
   * ```
   */
  multiplayer: {
    async create(options?: MultiplayerOptions): Promise<StarMultiplayer> {
      const mp = createMultiplayer();
      await mp.start(options);
      return mp;
    },
  },

  /**
   * Load configuration from .starrc file (Node.js only).
   * Useful for build scripts or SSR.
   *
   * @returns Config object or null if not found
   *
   * @example
   * ```javascript
   * const config = Star.loadConfig();
   * if (config) {
   *   console.log(`Game ID: ${config.gameId}`);
   * }
   * ```
   */
  loadConfig: loadConfigFromFile,

  /** SDK version */
  version: '0.1.0',
};

// ============================================================
// Exports
// ============================================================

export default Star;
export { Star };

// Re-export types for TypeScript users
export type {
  StarAudio,
  StarAudioOptions,
  Manifest,
  PlayOptions,
} from 'star-audio';

export type {
  GameContext,
  GameOptions,
  GameLoop,
  GameTick,
  GameUI,
} from 'star-canvas';

export type {
  StarLeaderboard,
  LeaderboardOptions,
  LeaderboardData,
  ScoreEntry,
  SubmitResult,
  GetScoresOptions,
  ShareOptions,
  ShareResult,
} from 'star-leaderboard';

export type {
  StarMultiplayer,
  Player,
  StartOptions as MultiplayerOptions,
} from 'star-multiplayer';

// Tree-shakeable named exports for advanced users
export { createStarAudio as audio } from 'star-audio';
export { game } from 'star-canvas';
export { createLeaderboard as leaderboard } from 'star-leaderboard';
export { createMultiplayer as multiplayer } from 'star-multiplayer';
