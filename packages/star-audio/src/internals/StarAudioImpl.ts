import type { AudioState, StarAudio, StarAudioOptions, PlayOptions, Manifest, SoundHandle, SynthDefinition, SynthPreset } from '../index';
import { VERSION } from '../index';
import { Howl, Howler } from 'howler';
import { isPreset, isSynthDefinition, resolveDefinition, generateWavUrl, PRESET_DEFINITIONS } from './ProceduralSynth';

type AssetGroup = 'music' | 'sfx';

interface PersistedState {
  mute: boolean;
  volumes: {
    music: number;
    sfx: number;
  };
}

/**
 * SoundHandle implementation wrapping a Howler sound ID
 * @internal
 */
class SoundHandleImpl implements SoundHandle {
  constructor(
    public id: string,
    private _howl: Howl,
    private _soundId: number
  ) {}
  
  get playing(): boolean {
    return this._howl.playing(this._soundId);
  }

  stop(at = 0): void {
    // Howler doesn't support scheduled stops, stop immediately
    this._howl.stop(this._soundId);
  }

  setVolume(v: number, _nowPlusSec = 0): void {
    const clampedVolume = Math.max(0, Math.min(1, v));
    // Howler doesn't support ramping per-voice, apply immediately
    this._howl.volume(clampedVolume, this._soundId);
  }
}

/**
 * The internal implementation of StarAudio wrapping Howler.js
 * @internal
 */
export class StarAudioImpl implements StarAudio {
  public readonly ready: Promise<void>;
  private _state: AudioState = 'locked';
  private readonly _sounds: Map<string, Howl> = new Map();
  private readonly _soundGroups: Map<string, AssetGroup> = new Map();
  private readonly _soundVolumes: Map<string, number> = new Map(); // Per-sound volume overrides
  private _currentMusicId: string | null = null;
  private _currentMusicSoundId: number | null = null;
  private _unlockHandlerRemover: (() => void) | null = null;
  private _eventTarget: EventTarget = new EventTarget();
  private _isMuted = false;
  private _volumes = { music: 0.8, sfx: 0.9 };
  private readonly _persistKey: string;
  private _visibilityHandler: (() => void) | null = null;
  private _readyResolver: (() => void) | null = null;
  private _pendingFadeTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly _generatedWavUrls: Map<string, string> = new Map(); // Cache generated WAV URLs

  // Music interface (initialized in constructor)
  music: StarAudio['music'];
  musicFadeTo: StarAudio['music']['crossfadeTo'];

  constructor(options: StarAudioOptions = {}) {
    // Log version on initialization
    console.log(`[Star Audio v${VERSION}] Initializing...`);
    
    this._persistKey = options.persistKey ?? 'star.audio.v0';
    
    // Load persisted state
    this._loadState();
    
    // Apply initial mute if specified
    if (options.initialMute !== undefined) {
      this._isMuted = options.initialMute;
    }
    
    // Apply initial volumes if specified
    if (options.initialVolumes) {
      if (options.initialVolumes.music !== undefined) {
        this._volumes.music = Math.max(0, Math.min(1, options.initialVolumes.music));
      }
      if (options.initialVolumes.sfx !== undefined) {
        this._volumes.sfx = Math.max(0, Math.min(1, options.initialVolumes.sfx));
      }
    }
    
    // Set Howler global volume based on mute state
    Howler.volume(this._isMuted ? 0 : 1);
    
    // Set up ready promise
    this.ready = new Promise((resolve) => {
      this._readyResolver = resolve;
      // Howler auto-handles unlock, so check if already unlocked
      if (Howler.ctx && Howler.ctx.state === 'running') {
        this._state = 'running';
        resolve();
      }
    });
    
    console.log('[StarAudio] SDK Initialized (powered by Howler.js)');
    
    // Set up unlock handling
    if (options.unlockWith !== false) {
      this.attachUnlock(options.unlockWith === 'auto' ? window : options.unlockWith);
    }

    // Set up visibility handling
    if (options.suspendOnHidden ?? true) {
      this._visibilityHandler = () => {
        if (document.visibilityState === 'hidden') {
          this.pause();
        } else if (document.visibilityState === 'visible') {
          this.resume();
        }
      };
      document.addEventListener('visibilitychange', this._visibilityHandler);
    }
    
    // Set up music interface
    this.music = {
      crossfadeTo: async (id: string, o: { duration?: number; loop?: boolean } = {}): Promise<void> => {
        const duration = (o.duration ?? 1.0) * 1000; // Convert to ms
        const loop = o.loop ?? true;
        
        const howl = this._sounds.get(id);
        if (!howl) {
          console.warn(`[StarAudio] Sound not loaded: ${id}`);
          return;
        }
        
        // If trying to crossfade to the same track that's already playing, just ensure it's looping correctly
        if (this._currentMusicId === id && this._currentMusicSoundId !== null) {
          console.log(`[StarAudio] Already playing ${id}, updating loop setting`);
          howl.loop(loop);
          return;
        }
        
        // Clear any pending fade timeout to prevent race conditions
        if (this._pendingFadeTimeout !== null) {
          clearTimeout(this._pendingFadeTimeout);
          this._pendingFadeTimeout = null;
        }
        
        // Fade out current music
        if (this._currentMusicId && this._currentMusicSoundId !== null) {
          const currentHowl = this._sounds.get(this._currentMusicId);
          if (currentHowl) {
            const oldSoundId = this._currentMusicSoundId;
            currentHowl.fade(currentHowl.volume(), 0, duration, oldSoundId);
            this._pendingFadeTimeout = setTimeout(() => {
              currentHowl.stop(oldSoundId);
              this._pendingFadeTimeout = null;
            }, duration);
          }
        }
        
        // Start new music with fade in
        // SAFETY: Check audio duration before enabling loop to prevent infinite recursion with ultra-short files
        const audioDuration = howl.duration();
        const safeToLoop = loop && audioDuration > 0.1; // Minimum 100ms to safely loop
        
        if (loop && !safeToLoop) {
          console.warn(`[StarAudio] ⚠️  Audio "${id}" is too short (${audioDuration.toFixed(3)}s) to loop safely - disabling loop to prevent crash`);
        }
        
        howl.loop(safeToLoop);
        howl.volume(0);
        const soundId = howl.play();
        howl.fade(0, this._volumes.music, duration, soundId);
        
        this._currentMusicId = id;
        this._currentMusicSoundId = soundId;
      },

      stop: (fadeSec = 0.2): void => {
        // Clear any pending fade timeout
        if (this._pendingFadeTimeout !== null) {
          clearTimeout(this._pendingFadeTimeout);
          this._pendingFadeTimeout = null;
        }
        
        if (this._currentMusicId && this._currentMusicSoundId !== null) {
          const howl = this._sounds.get(this._currentMusicId);
          if (howl) {
            const soundId = this._currentMusicSoundId;
            howl.fade(howl.volume(), 0, fadeSec * 1000, soundId);
            this._pendingFadeTimeout = setTimeout(() => {
              howl.stop(soundId);
              this._currentMusicId = null;
              this._currentMusicSoundId = null;
              this._pendingFadeTimeout = null;
            }, fadeSec * 1000);
          }
        }
      },

      fadeTo: undefined as unknown as StarAudio['music']['crossfadeTo'],
      switchTo: undefined as unknown as StarAudio['music']['crossfadeTo'],
    };
    
    // Set up aliases
    this.music.fadeTo = this.music.crossfadeTo;
    this.music.switchTo = this.music.crossfadeTo;
    this.musicFadeTo = this.music.crossfadeTo;

    // Auto-preload all 17 built-in synth presets so play() works on first call
    for (const presetName of Object.keys(PRESET_DEFINITIONS) as SynthPreset[]) {
      this._loadProceduralSound(presetName, presetName).catch(err => {
        console.warn(`[StarAudio] Failed to auto-preload preset ${presetName}:`, err);
      });
    }
  }

  get state(): AudioState {
    return this._state;
  }
  
  // --- Asset Loading ---

  async preload(manifest: Manifest): Promise<void> {
    const promises: Promise<void>[] = [];
    
    for (const [id, value] of Object.entries(manifest)) {
      // Check if it's a procedural sound (preset or synth definition)
      if (isPreset(value) || isSynthDefinition(value)) {
        promises.push(this._loadProceduralSound(id, value as SynthPreset | SynthDefinition));
        continue;
      }
      
      // Check if it's a file-based sound
      if (typeof value === 'string' || Array.isArray(value)) {
        // Safety check: if it's a string with no extension, might be a typo'd preset name
        const strValue = Array.isArray(value) ? value[0] : value;
        if (typeof strValue === 'string' && !strValue.includes('.') && !strValue.startsWith('http')) {
          console.error(`[StarAudio] ⚠️  "${id}: '${strValue}'" looks like an invalid preset name. Valid presets: beep, click, select, jump, swoosh, shoot, laser, explosion, hit, hurt, coin, pickup, bonus, unlock, powerup, error, success. Use { synth: 'presetName' } for presets or provide a valid audio file path.`);
          continue; // Skip loading, don't crash
        }
        promises.push(this.load({ id, src: value }));
      } else {
        // Object with src/url/synth and optional volume
        const volume = 'volume' in value ? value.volume : undefined;
        if (volume !== undefined) {
          this._soundVolumes.set(id, volume);
        }
        
        if ('synth' in value && value.synth) {
          promises.push(this._loadProceduralSound(id, value.synth, value.group));
        } else {
          promises.push(this.load({ id, ...value }));
        }
      }
    }
    
    // Use allSettled instead of all - continue even if some sounds fail
    const results = await Promise.allSettled(promises);
    
    // Log summary of what loaded successfully
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    if (failed > 0) {
      console.warn(`[StarAudio] Preload completed: ${succeeded} succeeded, ${failed} failed`);
    } else {
      console.log(`[StarAudio] Preload completed: ${succeeded} sounds loaded`);
    }
  }
  
  private async _loadProceduralSound(id: string, value: SynthPreset | SynthDefinition, group?: 'music' | 'sfx'): Promise<void> {
    const definition = resolveDefinition(value);
    // Include definition AND preset name (if applicable) in cache key for proper versioning
    const defKey = typeof value === 'string' 
      ? `${value}:${JSON.stringify(definition)}`  // Preset: include name for versioning
      : JSON.stringify(definition);  // Custom: just the definition
    
    // Generate WAV URL (cached if already generated)
    let wavUrl = this._generatedWavUrls.get(defKey);
    if (!wavUrl) {
      wavUrl = await generateWavUrl(definition);
      this._generatedWavUrls.set(defKey, wavUrl);
    }
    
    // Infer group from ID if not specified
    const inferredGroup = group || this._inferGroup(id);
    this._soundGroups.set(id, inferredGroup);
    
    return new Promise((resolve, reject) => {
      // Create Howl instance (same as file-based audio)
      const howl = new Howl({
        src: [wavUrl],
        format: ['wav'], // CRITICAL: Tell Howler.js this is a WAV file (blob URLs have no extension)
        volume: this._volumes[inferredGroup],
        html5: true, // Use HTML5 Audio for mobile reliability and silent mode bypass
        onload: () => {
          console.log(`[StarAudio] Generated procedural sound: ${id}`);
          // Only add to map if successfully loaded
          this._sounds.set(id, howl);
          resolve();
        },
        onloaderror: (_id, error) => {
          console.warn(`[StarAudio] ⚠️  Failed to generate procedural sound "${id}" - the game will continue without this sound.`, error);
          this._eventTarget.dispatchEvent(new Event('error'));
          // Do NOT add failed sounds to the map
          this._soundGroups.delete(id); // Clean up the group entry too
          // Resolve anyway - never throw, keep games running
          resolve();
        },
      });
    });
  }

  async load(config: { id: string; src?: string | string[]; url?: string | string[]; group?: 'music' | 'sfx' }): Promise<void> {
    const { id, src, url, group } = config;
    const sources = src || url;
    
    if (!sources) {
      console.warn(`[StarAudio] No src/url provided for ${id}`);
      return;
    }
    
    // Infer group from ID if not specified
    const inferredGroup = group || this._inferGroup(id);
    this._soundGroups.set(id, inferredGroup);
    
    return new Promise((resolve, reject) => {
      const howl = new Howl({
        src: Array.isArray(sources) ? sources : [sources],
        volume: this._volumes[inferredGroup],
        html5: true, // FORCE HTML5 AUDIO FOR MOBILE RELIABILITY
        onload: () => {
          console.log(`[StarAudio] Loaded: ${id}`);
          // Only add to map if successfully loaded
          this._sounds.set(id, howl);
          resolve();
        },
        onloaderror: (_id, error) => {
          console.warn(`[StarAudio] ⚠️  Failed to load "${id}" - the game will continue without this sound.`, error);
          this._eventTarget.dispatchEvent(new Event('error'));
          // Do NOT add failed sounds to the map
          this._soundGroups.delete(id); // Clean up the group entry too
          // Resolve anyway - never throw, keep games running
          resolve();
        },
      });
    });
  }

  // --- Playback ---

  play(id: string, opts: PlayOptions = {}): SoundHandle | null {
    // Safety net: if a preset hasn't finished auto-preloading yet, trigger lazy generation.
    // With auto-preload in the constructor, this should rarely happen.
    if (isPreset(id) && !this._sounds.has(id)) {
      this._loadProceduralSound(id, id as SynthPreset).catch(err => {
        console.error(`[StarAudio] Failed to generate preset ${id}:`, err);
      });
      return null;
    }
    
    // Auto-load if src/url provided
    if ((opts.src || opts.url) && !this._sounds.has(id)) {
      console.log(`[StarAudio] Auto-loading: ${id}`);
      
      // Create Howl with autoplay enabled so it plays immediately after loading
      const sources: string | string[] = (opts.src || opts.url)!; // Safe: checked in if condition
      const inferredGroup = opts.group || this._inferGroup(id);
      this._soundGroups.set(id, inferredGroup);
      
      const requestedLoop = opts.loop ?? false;
      
      const howl = new Howl({
        src: Array.isArray(sources) ? sources : [sources],
        volume: opts.volume ?? this._volumes[inferredGroup],
        loop: false, // Set to false initially, check duration in onload
        rate: opts.rate ?? 1,
        html5: true,
        autoplay: true, // Auto-play as soon as loaded
        onload: () => {
          console.log(`[StarAudio] Loaded and playing: ${id}`);
          
          // SAFETY: Check duration before enabling loop to prevent infinite recursion
          if (requestedLoop) {
            const audioDuration = howl.duration();
            const safeToLoop = audioDuration > 0.1; // Minimum 100ms to safely loop
            
            if (!safeToLoop) {
              console.warn(`[StarAudio] ⚠️  Audio "${id}" is too short (${audioDuration.toFixed(3)}s) to loop safely - disabling loop to prevent crash`);
            } else {
              howl.loop(true);
            }
          }
          
          // Only add to map if successfully loaded
          this._sounds.set(id, howl);
        },
        onloaderror: (_id, error) => {
          console.warn(`[StarAudio] ⚠️  Failed to auto-load "${id}" - sound will not play.`, error);
          this._eventTarget.dispatchEvent(new Event('error'));
          // Do NOT add failed sounds to the map
          this._soundGroups.delete(id); // Clean up the group entry too
        },
      });
      
      // Return null since we can't get the sound ID until it starts playing
      // This matches the documented behavior for auto-load
      return null;
    }
    
    const howl = this._sounds.get(id);
    if (!howl) {
      console.warn(`[StarAudio] Sound not loaded: ${id}. Available presets: beep, coin, pickup, jump, hurt, shoot, laser, explosion, powerup, click, success, bonus, error`);
      return null;
    }
    
    // Determine effective volume: opts.volume > per-sound volume > group volume
    const group = this._soundGroups.get(id) || 'sfx';
    const perSoundVolume = this._soundVolumes.get(id);
    const effectiveVolume = opts.volume ?? perSoundVolume ?? this._volumes[group];
    
    // Apply options
    if (effectiveVolume !== undefined) {
      howl.volume(effectiveVolume);
    }
    if (opts.loop !== undefined) {
      // SAFETY: Check audio duration before enabling loop to prevent infinite recursion
      const audioDuration = howl.duration();
      const safeToLoop = opts.loop && audioDuration > 0.1; // Minimum 100ms to safely loop
      
      if (opts.loop && !safeToLoop) {
        console.warn(`[StarAudio] ⚠️  Audio "${id}" is too short (${audioDuration.toFixed(3)}s) to loop safely - disabling loop to prevent crash`);
      }
      
      howl.loop(safeToLoop);
    }
    if (opts.rate !== undefined) {
      howl.rate(opts.rate);
    }
    
    try {
      const soundId = howl.play();

      // Track if this is an SFX for voice limiting (music doesn't count)
      const group = this._soundGroups.get(id) || 'sfx';
      if (group === 'sfx') {
        // Howler handles voice limiting automatically, so we don't need to
      }

      return new SoundHandleImpl(id, howl, soundId);
    } catch (error) {
      console.warn(`[StarAudio] Failed to play ${id}:`, error);
      this._eventTarget.dispatchEvent(new Event('error'));
      return null;
    }
  }

  playSound = this.play;

  // --- Volume & Mute ---

  setMusicVolume(v: number, _o: { durationMs?: number } = {}): void {
    const clampedVolume = Math.max(0, Math.min(1, v));
    this._volumes.music = clampedVolume;
    
    // Apply to all music sounds
    for (const [id, howl] of this._sounds.entries()) {
      if (this._soundGroups.get(id) === 'music') {
        howl.volume(clampedVolume);
      }
    }
    
    this._saveState();
  }

  setSfxVolume(v: number, _o: { durationMs?: number } = {}): void {
    const clampedVolume = Math.max(0, Math.min(1, v));
    this._volumes.sfx = clampedVolume;
    
    // Apply to all sfx sounds
    for (const [id, howl] of this._sounds.entries()) {
      if (this._soundGroups.get(id) === 'sfx') {
        howl.volume(clampedVolume);
      }
    }
    
    this._saveState();
  }

  setMusic = this.setMusicVolume;
  setSfx = this.setSfxVolume;

  setMute(muted: boolean): void {
    this._isMuted = muted;
    Howler.volume(muted ? 0 : 1);
    this._saveState();
  }

  mute = this.setMute;

  toggleMute(): void {
    this.setMute(!this._isMuted);
  }

  isMuted(): boolean {
    return this._isMuted;
  }

  // --- Lifecycle ---

  pause = async (): Promise<void> => {
    // Pause all currently playing sounds
    for (const howl of this._sounds.values()) {
      howl.pause();
    }
    this._state = 'suspended';
    this._eventTarget.dispatchEvent(new Event('suspended'));
  };

  resume = async (): Promise<void> => {
    if (this._state === 'locked') {
      // Unlock will happen on first user interaction via Howler
      console.log('[StarAudio] Context will unlock on first user interaction');
    }
    
    // Resume music if it was playing (Howler.js resumes from paused position)
    if (this._currentMusicId && this._currentMusicSoundId !== null) {
      const musicHowl = this._sounds.get(this._currentMusicId);
      // Only resume if the sound is not already playing to avoid infinite loop with looped sounds
      if (musicHowl && !musicHowl.playing(this._currentMusicSoundId)) {
        musicHowl.play(this._currentMusicSoundId);
      }
    }
    
    this._state = 'running';
    this._eventTarget.dispatchEvent(new Event('resumed'));
    if (this._readyResolver) {
      this._readyResolver();
      this._readyResolver = null;
    }
  };

  unlock = this.resume;

  attachUnlock(target?: HTMLElement | Document | Window): void {
    if (this._unlockHandlerRemover) {
      this._unlockHandlerRemover();
      this._unlockHandlerRemover = null;
    }

    // Handle iframe context
    let effectiveTarget: any = target || window;
    if (effectiveTarget === window && window.self !== window.top) {
      console.log('[StarAudio] Detected iframe context, attaching unlock to document');
      effectiveTarget = document;
    }

    if (!effectiveTarget) return;

    const handler = () => {
      console.log('[StarAudio] User interaction detected');
      this._unlock();
    };
    
    // Register handler for multiple event types to ensure reliable unlock
    const events = ['pointerdown', 'touchstart', 'keydown', 'click'];
    events.forEach(eventType => {
      effectiveTarget.addEventListener(eventType, handler, { once: true, capture: true });
    });

    this._unlockHandlerRemover = () => {
      events.forEach(eventType => {
        effectiveTarget.removeEventListener(eventType, handler, { capture: true });
      });
    };
  }

  // --- Events ---

  on(evt: string, cb: () => void): void {
    this._eventTarget.addEventListener(evt, cb);
  }

  off(evt: string, cb: () => void): void {
    this._eventTarget.removeEventListener(evt, cb);
  }

  // --- Cleanup ---

  destroy(): void {
    if (this._unlockHandlerRemover) {
      this._unlockHandlerRemover();
    }
    if (this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
    }
    
    // Clear any pending fade timeout
    if (this._pendingFadeTimeout !== null) {
      clearTimeout(this._pendingFadeTimeout);
      this._pendingFadeTimeout = null;
    }
    
    // Stop and unload all sounds
    for (const howl of this._sounds.values()) {
      howl.unload();
    }
    this._sounds.clear();
    
    // Revoke generated WAV blob URLs to free memory
    for (const url of this._generatedWavUrls.values()) {
      URL.revokeObjectURL(url);
    }
    this._generatedWavUrls.clear();
  }

  // --- Private Methods ---

  private _unlock(): void {
    if (this._state === 'running') return;
    
    // Howler handles unlock automatically, we just update state
    this._state = 'running';
    this._eventTarget.dispatchEvent(new Event('unlocked'));
    console.log('[StarAudio] ✅ Unlocked (Howler handling audio context)');
    
    if (this._readyResolver) {
      this._readyResolver();
      this._readyResolver = null;
    }
  }

  private _inferGroup(id: string): AssetGroup {
    const lower = id.toLowerCase();
    if (lower.startsWith('music.') || lower.startsWith('bgm.')) {
      return 'music';
    }
    return 'sfx';
  }

  private _loadState(): void {
    try {
      const stored = localStorage.getItem(this._persistKey);
      if (stored) {
        const state: PersistedState = JSON.parse(stored);
        this._isMuted = state.mute;
        this._volumes = state.volumes;
      }
    } catch (e) {
      console.warn('[StarAudio] Could not load persisted state.');
    }
  }
  
  private _saveState(): void {
    try {
      const state: PersistedState = {
        mute: this._isMuted,
        volumes: this._volumes,
      };
      localStorage.setItem(this._persistKey, JSON.stringify(state));
    } catch (e) {
      console.warn('[StarAudio] Could not save persisted state.');
    }
  }
}
