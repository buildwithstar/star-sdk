/* eslint-disable @typescript-eslint/no-empty-interface */

// Public API for star-audio
// =================================================================================================

/**
 * Star Audio SDK version
 */
export const VERSION = '0.1.0';

/**
 * The possible states of the audio context.
 * - `locked`: The audio context is waiting for a user gesture to start.
 * - `running`: The audio context is active and playing sound.
 * - `suspended`: The audio context is paused.
 */
export type AudioState = 'locked' | 'running' | 'suspended';

/**
 * Predefined procedural sound presets.
 */
export type SynthPreset =
  | 'beep' | 'coin' | 'pickup' | 'jump' | 'hurt'
  | 'explosion' | 'powerup' | 'shoot' | 'laser'
  | 'error' | 'click' | 'success' | 'bonus'
  | 'select' | 'unlock' | 'swoosh' | 'hit';

/**
 * Custom procedural sound definition using Web Audio API oscillators.
 */
export interface SynthDefinition {
  waveform?: 'sine' | 'square' | 'sawtooth' | 'triangle';
  frequency?: number | number[];  // Single frequency or arpeggio/sweep
  duration?: number;
  volume?: number;
  envelope?: 'percussive' | 'sustained';
}

/**
 * A manifest of audio assets to load.
 * The key is the asset ID, and the value can be:
 * - A URL string (file-based audio)
 * - An array of URLs (multiple formats)
 * - A SynthPreset string (procedural preset sound)
 * - A SynthDefinition object (custom procedural sound)
 * - An object with `src`/`url`/`synth` and optional `group` properties
 */
export type Manifest = Record<
  string,
  | string                  // URL or preset name
  | string[]                // Multiple URLs
  | SynthPreset             // Preset name
  | SynthDefinition         // Custom synth
  | {
      src?: string | string[];
      url?: string | string[];
      synth?: SynthPreset | SynthDefinition;
      group?: 'music' | 'sfx';
      volume?: number;        // Default volume for this sound (0-1)
    }
>;

/**
 * Options for playing a sound.
 */
export interface PlayOptions {
  src?: string | string[]; // auto-load if not already loaded (alias: url)
  url?: string | string[]; // alias of src
  volume?: number;         // 0..1 (default 1)
  loop?: boolean;          // default false
  rate?: number;           // 0.5..2
  detune?: number;         // cents (if supported)
  when?: number;           // schedule offset (sec) from AudioContext.currentTime
  offset?: number;         // buffer offset (sec) to start playback from
  duration?: number;       // stop after (sec)
  group?: 'music' | 'sfx'; // override inference from asset ID
}

/**
 * A handle to a playing sound, allowing for control over its playback.
 */
export interface SoundHandle {
  id: string;
  stop(at?: number): void;
  setVolume(v: number, nowPlusSec?: number): void;
  readonly playing: boolean;
}

/**
 * Options for creating a StarAudio instance.
 */
export interface StarAudioOptions {
  unlockWith?: 'auto' | HTMLElement | Document | Window | false; // default 'auto'
  autostart?: string | { id: string; crossfadeSec?: number; loop?: boolean };
  autoplay?: StarAudioOptions['autostart']; // alias for autostart
  maxSfxVoices?: number;                 // default 24
  initialMute?: boolean;                 // default false
  initialVolumes?: { music?: number; sfx?: number }; // defaults: music 0.8, sfx 0.9
  suspendOnHidden?: boolean;             // default true
  persistKey?: string;                   // default 'star.audio.v0'
  ducking?: boolean | { amount?: number; holdMs?: number; releaseMs?: number };
  latencyHint?: 'interactive' | 'balanced' | 'playback'; // default 'interactive'
}

/**
 * The main interface for the Star Audio manager.
 */
export interface StarAudio {
  // State
  readonly state: AudioState;
  readonly ready: Promise<void>;

  // Assets
  preload(m: Manifest): Promise<void>;
  load(o: { id: string; src?: string | string[]; url?: string | string[]; group?: 'music' | 'sfx' }): Promise<void>;

  // Playback
  play(id: string, opts?: PlayOptions): SoundHandle | null;
  playSound: StarAudio['play']; // alias

  // Music Helpers
  music: {
    crossfadeTo(id: string, o?: { duration?: number; loop?: boolean }): Promise<void>;
    stop(fadeSec?: number): void;
    // Aliases
    fadeTo: StarAudio['music']['crossfadeTo'];
    switchTo: StarAudio['music']['crossfadeTo'];
  };
  musicFadeTo: StarAudio['music']['crossfadeTo']; // Top-level alias

  // Mix
  setMusicVolume(v: number, o?: { durationMs?: number }): void;
  setSfxVolume(v: number, o?: { durationMs?: number }): void;
  setMusic: StarAudio['setMusicVolume']; // alias
  setSfx: StarAudio['setSfxVolume']; // alias
  setMute(muted: boolean): void;
  mute: StarAudio['setMute']; // alias
  toggleMute(): void;
  isMuted(): boolean;

  // Lifecycle
  pause(): Promise<void>;
  resume(): Promise<void>;
  unlock(): Promise<void>; // alias of resume()
  attachUnlock(target?: HTMLElement | Document | Window): void;

  // Events
  on(evt: 'unlocked' | 'suspended' | 'resumed' | 'error', cb: () => void): void;
  off(evt: 'unlocked' | 'suspended' | 'resumed' | 'error', cb: () => void): void;

  // Cleanup
  destroy(): void;
}

import { StarAudioImpl } from './internals/StarAudioImpl';


/**
 * Creates a new StarAudio instance.
 * @param opts - A set of options for configuring the audio manager.
 * @returns A new `StarAudio` instance.
 */
export function createStarAudio(opts?: StarAudioOptions): StarAudio {
  if (typeof window === 'undefined' || !((window as any).AudioContext || (window as any).webkitAudioContext)) {
    throw new Error('[StarAudio] createStarAudio must be called in a browser (no AudioContext).');
  }

  return new StarAudioImpl(opts);
}

/**
 * Default export for LLM-friendliness and easy adoption.
 * @see createStarAudio
 */
export default createStarAudio;
