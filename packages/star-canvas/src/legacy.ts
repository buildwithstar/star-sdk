/**
 * Star DOM SDK - Legacy Entry Point
 *
 * This entry point preserves backward compatibility with games created before v0.7.
 * It defaults to 'responsive' mode (no fixed dimensions).
 *
 * New games should use the main entry point which defaults to 'landscape' preset.
 */

import { game as originalGame } from './index';
import type { GameOptions, GameContext } from './index';

// Re-export everything except game
export {
  version,
  createDragState,
  type GameTick,
  type GameLoop,
  type GameUI,
  type GameContext,
  type GameOptions,
  type DragState,
} from './index';

/**
 * Legacy game entry point - defaults to responsive mode for backward compatibility.
 * New games should use '/star-sdk/dom-v1.js' which defaults to fixed-height mode.
 */
export function game(setup: (g: GameContext) => void, options: GameOptions = {}): void {
  // Apply responsive default for backward compatibility
  const legacyOptions: GameOptions = { preset: 'responsive', ...options };
  return originalGame(setup, legacyOptions);
}
