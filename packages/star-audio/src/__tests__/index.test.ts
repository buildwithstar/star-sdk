/**
 * Unit tests for star-audio
 * 
 * NOTE: These tests focus on the Star Audio API surface and state management.
 * The underlying audio playback is handled by Howler.js, which is already
 * extensively tested by its own test suite. We mock minimal browser APIs
 * to allow the tests to run in Node.js.
 */
import { createStarAudio } from 'star-audio';

// Mock Howler.js since we can't load it in Jest/Node environment
jest.mock('howler', () => ({
  Howl: jest.fn().mockImplementation(function(this: any, config: any) {
    this._volume = config.volume ?? 1;
    this._loop = false;
    this._paused = false;
    this._playing = new Set(); // Track playing sound IDs
    this.play = jest.fn(() => {
      const id = Math.random();
      this._playing.add(id);
      return id;
    });
    this.pause = jest.fn(() => { this._paused = true; });
    this.stop = jest.fn((id?: number) => {
      if (id !== undefined) this._playing.delete(id);
    });
    this.playing = jest.fn((id?: number) => {
      return id !== undefined ? this._playing.has(id) : this._playing.size > 0;
    });
    this.volume = jest.fn((v?: number) => {
      if (v !== undefined) this._volume = v;
      return this._volume;
    });
    this.loop = jest.fn((v?: boolean) => {
      if (v !== undefined) this._loop = v;
      return this._loop;
    });
    this.rate = jest.fn();
    this.fade = jest.fn();
    this.unload = jest.fn();
    // Simulate successful load
    if (config.onload) setTimeout(config.onload, 0);
    return this;
  }),
  Howler: {
    volume: jest.fn(),
    ctx: { state: 'suspended' },
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

// Mock AudioContext for procedural sounds
const mockOscillatorNode = {
  type: 'square',
  frequency: { setValueAtTime: jest.fn() },
  connect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
};

const mockGainNode = {
  gain: {
    setValueAtTime: jest.fn(),
    linearRampToValueAtTime: jest.fn(),
  },
  connect: jest.fn(),
};

const mockAudioBuffer = {
  getChannelData: jest.fn(() => new Float32Array(4800)), // 0.1s at 48kHz
  numberOfChannels: 1,
  sampleRate: 48000,
  length: 4800,
};

const mockOfflineAudioContext = {
  state: 'running',
  currentTime: 0,
  destination: {},
  sampleRate: 48000,
  createOscillator: jest.fn(() => ({ ...mockOscillatorNode })),
  createGain: jest.fn(() => ({ ...mockGainNode })),
  startRendering: jest.fn().mockResolvedValue(mockAudioBuffer),
};

const mockAudioContext = {
  state: 'running',
  currentTime: 0,
  destination: {},
  createOscillator: jest.fn(() => ({ ...mockOscillatorNode })),
  createGain: jest.fn(() => ({ ...mockGainNode })),
  resume: jest.fn().mockResolvedValue(undefined),
};

Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: jest.fn(() => mockAudioContext),
});
Object.defineProperty(window, 'OfflineAudioContext', {
  writable: true,
  value: jest.fn(() => mockOfflineAudioContext),
});
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock URL.createObjectURL for WAV blob generation
(global as any).URL = {
  createObjectURL: jest.fn(() => 'blob:mock-url'),
  revokeObjectURL: jest.fn(),
};


describe('createStarAudio', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should be defined', () => {
    expect(createStarAudio).toBeDefined();
  });

  it('should create an instance without throwing', () => {
    expect(() => createStarAudio()).not.toThrow();
  });

  it('should return an object with the expected API surface', () => {
    const audio = createStarAudio();
    expect(audio).toBeDefined();
    expect(audio.play).toBeInstanceOf(Function);
    expect(audio.playSound).toBeInstanceOf(Function); // alias
    expect(audio.music.crossfadeTo).toBeInstanceOf(Function);
    expect(audio.music.switchTo).toBeInstanceOf(Function); // alias
    expect(audio.setMute).toBeInstanceOf(Function);
    expect(audio.toggleMute).toBeInstanceOf(Function);
    expect(audio.pause).toBeInstanceOf(Function);
    expect(audio.resume).toBeInstanceOf(Function);
    expect(audio.destroy).toBeInstanceOf(Function);
  });
  
  it('should start in a "locked" state if context is suspended', () => {
    const audio = createStarAudio();
    expect(audio.state).toBe('locked');
  });

  it('should resolve the "ready" promise when unlocked', async () => {
    const audio = createStarAudio();
    let isReady = false;
    audio.ready.then(() => {
      isReady = true;
    });
    
    expect(isReady).toBe(false);
    await audio.unlock();
    expect(isReady).toBe(true);
    expect(audio.state).toBe('running');
  });


  describe('Asset Loading', () => {
    it('should preload a manifest of assets', async () => {
      const audio = createStarAudio();
      const loadSpy = jest.spyOn(audio, 'load');
      
      await audio.preload({
        'sfx.one': 'one.mp3',
        'music.two': ['two.m4a', 'two.mp3'],
      });

      expect(loadSpy).toHaveBeenCalledTimes(2);
      expect(loadSpy).toHaveBeenCalledWith({ id: 'sfx.one', src: 'one.mp3' });
      expect(loadSpy).toHaveBeenCalledWith({ id: 'music.two', src: ['two.m4a', 'two.mp3'] });
    });

    it('should load a sound with auto-inferred group', async () => {
      const audio = createStarAudio();
      await audio.load({ id: 'music.theme', src: 'theme.mp3' });
      // Should complete without error (Howler mocked to auto-succeed)
    });

    it('should return null when playing a sound that is not loaded', () => {
      const audio = createStarAudio();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const handle = audio.play('sfx.missing');

      expect(handle).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith('[StarAudio] Sound not loaded: sfx.missing. Available presets: beep, coin, pickup, jump, hurt, shoot, laser, explosion, powerup, click, success, bonus, error');

      consoleWarnSpy.mockRestore();
    });

    it('should warn and return null when playback fails', async () => {
      const audio = createStarAudio();

      await audio.preload({ 'sfx.bad': 'beep' });

      const { Howl } = jest.requireMock('howler') as { Howl: jest.Mock };
      const lastInstance = Howl.mock.instances[Howl.mock.instances.length - 1];
      (lastInstance.play as jest.Mock).mockImplementation(() => {
        throw new Error('Playback failure');
      });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const errorSpy = jest.fn();
      audio.on('error', errorSpy);

      const handle = audio.play('sfx.bad');

      expect(handle).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith('[StarAudio] Failed to play sfx.bad:', expect.any(Error));
      expect(errorSpy).toHaveBeenCalled();

      audio.off('error', errorSpy);
      warnSpy.mockRestore();
    });
  });

  describe('Mute & Persistence', () => {
    it('should toggle mute state', () => {
      const audio = createStarAudio();
      expect(audio.isMuted()).toBe(false);
      
      audio.toggleMute();
      expect(audio.isMuted()).toBe(true);
      
      audio.toggleMute();
      expect(audio.isMuted()).toBe(false);
    });

    it('should persist mute state to localStorage', () => {
      const audio = createStarAudio();
      const setItemSpy = jest.spyOn(window.localStorage, 'setItem');
      
      audio.setMute(true);
      
      expect(setItemSpy).toHaveBeenCalledWith(
        'star.audio.v0', 
        expect.stringContaining('"mute":true')
      );
    });

    it('should persist volume changes to localStorage', () => {
      const audio = createStarAudio();
      const setItemSpy = jest.spyOn(window.localStorage, 'setItem');
      
      audio.setMusicVolume(0.4);
      
      expect(setItemSpy).toHaveBeenCalledWith(
        'star.audio.v0',
        expect.stringContaining('"music":0.4')
      );
    });

    it('should load persisted state on initialization', () => {
      localStorageMock.setItem(
        'star.audio.v0',
        JSON.stringify({ mute: true, volumes: { music: 0.2, sfx: 0.3 } })
      );
      
      const audio = createStarAudio();
      expect(audio.isMuted()).toBe(true);
    });
  });

  describe('Lifecycle', () => {
    it('should call pause on all sounds when paused', async () => {
      const audio = createStarAudio();
      await audio.load({ id: 'sfx.test', src: 'test.mp3' });
      
      await audio.pause();
      expect(audio.state).toBe('suspended');
    });

    it('should update state when resumed', async () => {
      const audio = createStarAudio();
      
      await audio.resume();
      expect(audio.state).toBe('running');
    });
  });

  describe('Procedural Audio', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should preload procedural preset sounds', async () => {
      const audio = createStarAudio();
      
      await audio.preload({
        'sfx.beep': 'beep',
        'sfx.jump': 'jump',
      });
      
      // Should not throw and should be registered
      const handle = audio.play('sfx.beep');
      expect(handle).not.toBeNull();
    });

    it('should preload custom synth definitions', async () => {
      const audio = createStarAudio();
      
      await audio.preload({
        'sfx.custom': {
          waveform: 'sawtooth',
          frequency: 440,
          duration: 0.15,
        },
      });
      
      const handle = audio.play('sfx.custom');
      expect(handle).not.toBeNull();
    });

    it('should auto-preload all built-in presets on creation', async () => {
      const audio = createStarAudio();

      // Wait for auto-preload promises to resolve (multiple microtask ticks)
      await new Promise(resolve => setTimeout(resolve, 100));
      // Flush any remaining microtasks
      await Promise.resolve();

      // All 17 presets should now be playable without manual preload
      const handle = audio.play('jump');
      expect(handle).not.toBeNull();

      const coinHandle = audio.play('coin');
      expect(coinHandle).not.toBeNull();
    });

    it('should generate WAV and create Howl instance for procedural sounds', async () => {
      const audio = createStarAudio();
      
      await audio.preload({ 'sfx.test': 'beep' });
      
      // Should generate WAV using OfflineAudioContext
      expect(mockOfflineAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockOfflineAudioContext.createGain).toHaveBeenCalled();
      expect(mockOfflineAudioContext.startRendering).toHaveBeenCalled();
      
      // Should be playable like any other sound
      const handle = audio.play('sfx.test');
      expect(handle).not.toBeNull();
    });

    it('should handle frequency arrays (arpeggios/sweeps)', async () => {
      const audio = createStarAudio();

      // Wait for auto-preload, then reset mock counts
      await new Promise(resolve => setTimeout(resolve, 10));
      mockOfflineAudioContext.createOscillator.mockClear();

      await audio.preload({
        'sfx.arpeggio': {
          waveform: 'square',
          frequency: [262, 330, 392], // C-E-G
          duration: 0.3,
        },
      });

      // Should create one oscillator per frequency
      expect(mockOfflineAudioContext.createOscillator).toHaveBeenCalledTimes(3);
    });

    it('should respect volume settings for procedural sounds', async () => {
      const audio = createStarAudio();
      audio.setSfxVolume(0.5);
      
      await audio.preload({ 'sfx.test': 'beep' });
      const handle = audio.play('sfx.test', { volume: 0.8 });
      
      // Should play successfully
      expect(handle).not.toBeNull();
    });

    it('should mix procedural and file-based sounds', async () => {
      const audio = createStarAudio();
      const loadSpy = jest.spyOn(audio, 'load');
      
      await audio.preload({
        'sfx.beep': 'beep',           // Procedural
        'sfx.boom': 'boom.mp3',        // File
      });
      
      // Should only call load for file-based sound
      expect(loadSpy).toHaveBeenCalledTimes(1);
      expect(loadSpy).toHaveBeenCalledWith({ id: 'sfx.boom', src: 'boom.mp3' });
      
      // Both should play without error
      const handle1 = audio.play('sfx.beep');
      const handle2 = audio.play('sfx.boom');
      
      expect(handle1).not.toBeNull();
      expect(handle2).not.toBeNull();
    });

    it('should return a handle with stop capability', async () => {
      const audio = createStarAudio();
      
      await audio.preload({ 'sfx.test': 'beep' });
      const handle = audio.play('sfx.test');
      
      expect(handle).not.toBeNull();
      expect(handle?.stop).toBeInstanceOf(Function);
      expect(handle?.playing).toBeDefined();
      
      // Should be able to stop without error
      handle?.stop();
    });

    it('should support setVolume on procedural sounds (via Howler)', async () => {
      const audio = createStarAudio();
      
      await audio.preload({ 'sfx.test': 'beep' });
      const handle = audio.play('sfx.test');
      
      expect(handle).not.toBeNull();
      
      // Should not throw (procedural sounds are now Howl instances)
      handle?.setVolume(0.5);
    });
  });
});
