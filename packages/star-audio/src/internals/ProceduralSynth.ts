import type { SynthPreset, SynthDefinition } from '../index';

/**
 * Global volume multiplier for all procedural sounds.
 * Procedural waveforms (especially square/sawtooth) are much harsher than
 * typical audio files, so we apply a global reduction to make them pleasant.
 * 
 * Set very conservatively low - raw oscillators are MUCH louder than you'd expect.
 * Users can increase volume if needed, but we can't un-annoy them if too loud.
 * 
 * Note: This scales ALL procedural sounds before any other volume multipliers.
 * Final volume = presetVolume × PROCEDURAL_VOLUME_SCALE × groupVolume × optionsVolume
 */
const PROCEDURAL_VOLUME_SCALE = 0.03;

/**
 * Version string for cache busting during development.
 * Increment when changing preset definitions to force regeneration.
 */
const PRESET_VERSION = 'v34';

/**
 * Preset definitions for common game sounds.
 * Each preset is optimized for its game action context.
 * Note: Volume values are relative to each other; actual output is scaled by PROCEDURAL_VOLUME_SCALE.
 */
export const PRESET_DEFINITIONS: Record<SynthPreset, SynthDefinition> = {
  beep: {
    waveform: 'square',  // More presence than sine
    frequency: [660, 880],  // E5-A5 - friendly "boop boop"
    duration: 0.1,  // Two-tone button press
    volume: 0.38,  // Clear confirmation
    envelope: 'percussive',
  },
  coin: {
    waveform: 'sine',  // Pure, bell-like "ting"
    frequency: [988, 1318, 1568, 1976],  // B5-E6-G6-B6 - shimmery ascending
    duration: 0.16,  // Quick but lets the shimmer breathe
    volume: 0.42,  // Rewarding presence
    envelope: 'percussive',
  },
  pickup: {
    waveform: 'sine',  // Pure, satisfying
    frequency: [784, 988, 1175, 1397],  // G-B-D-F# - bright rising
    duration: 0.13,  // Quick but complete
    volume: 0.40,  // Satisfying positive feedback
    envelope: 'percussive',
  },
  jump: {
    waveform: 'triangle',  // Warmer, less harsh than square
    frequency: [180, 240, 320, 450],  // Quick rising arpeggio simulates "boing"
    duration: 0.15,  // Tighter for snappier feel
    volume: 0.7,  // 2x for satisfying bounce feedback
    envelope: 'percussive',
  },
  hurt: {
    waveform: 'sawtooth',  // Harsh, painful quality
    frequency: [600, 400, 250, 150],  // Sharp descending sweep - "oof!"
    duration: 0.25,  // Quick but noticeable
    volume: 0.28,  // Slightly more presence for feedback
    envelope: 'percussive',
  },
  explosion: {
    waveform: 'sawtooth',  // Harsh, noise-like
    frequency: [
      800, 600, 450, 320, 220,  // Initial crack/burst (fast descent)
      160, 120, 90, 70, 55,     // Transition to rumble
      45, 40, 35, 30            // Deep rumble tail
    ],  // Dense frequency sweep simulates noise
    duration: 0.65,  // Long tail for satisfying boom
    volume: 0.45,  // Needs big presence
    envelope: 'percussive',
  },
  powerup: {
    waveform: 'triangle',  // Warm, rich
    frequency: [262, 330, 392, 523, 659, 784, 1046],  // C-E-G-C-E-G-C - full ascending cascade
    duration: 0.48,  // Long celebration
    volume: 0.44,  // Epic presence
    envelope: 'sustained',
  },
  shoot: {
    waveform: 'triangle',  // Versatile - works for guns, bows, throws, spells
    frequency: [
      1800, 1400,          // Quick "release" attack (projectile launch feel)
      900, 600,            // Mid-range arc (satisfying descent)
      380, 220             // Subtle bass anchor (adds weight without being heavy)
    ],  // Universal projectile: works for bullets, arrows, fireballs, thrown items
    duration: 0.10,        // Fast - perfect for rapid fire
    volume: 0.45,          // Present but not overpowering
    envelope: 'percussive',
  },
  laser: {
    waveform: 'sawtooth',  // Rich harmonics for that sci-fi "zing" bite
    frequency: [
      3200, 2800, 2400,      // Powerful charge-up without the shrillness
      1800, 1400, 1000,      // Mid-range energy sweep (moderate)
      700, 450, 260, 140     // Bass impact tail (satisfying thump)
    ],  // Valve-quality energy weapon: smooth attack → powerful descent → bass punch
    duration: 0.18,  // Slightly longer for the full sci-fi experience
    volume: 0.42,  // Punchy presence - this is a WEAPON
    envelope: 'percussive',
  },
  error: {
    waveform: 'sawtooth',  // Harsh, unpleasant (intentionally)
    frequency: [800, 500, 250, 150],  // Sharp descending blast - "WRONG!"
    duration: 0.22,  // Long enough to register as negative
    volume: 0.32,  // Needs to be noticed
    envelope: 'percussive',
  },
  click: {
    waveform: 'sine',  // Pure, pleasant
    frequency: 800,  // Simple, clean tone
    duration: 0.05,  // Quick
    volume: 0.7,  // 2x previous (was 0.35)
    envelope: 'percussive',
  },
  success: {
    waveform: 'triangle',  // Warm, full
    frequency: [
      784, 988, 1175,           // G-B-D (ascending excitement - "dun dun dun")
      1046, 1318, 1568, 1976,   // C-E-G-B (soaring triumphant ascent)
      2349   // D-D-D-D (sustained victorious peak)
    ],  // Victory phrase with sustained high note at end
    duration: 1.2,  // Extended for longer sustained finale
    volume: 0.48,  // Victorious presence
    envelope: 'sustained',
  },
  bonus: {
    waveform: 'sine',  // Pure, magical sparkle
    frequency: [659, 880, 1046, 1318, 1568, 1976],  // E-A-C-E-G-B - soaring ascent
    duration: 0.42,  // Longer celebration
    volume: 0.50,  // BIGGEST reward - most epic sound
    envelope: 'sustained',
  },
  select: {
    waveform: 'sine',  // Pure, pleasant - not annoying when repeated
    frequency: [880, 1046],  // A-C - gentle upward confirmation
    duration: 0.06,  // Very quick - instant responsive feedback
    volume: 0.35,  // Subtle - plays constantly in menus
    envelope: 'percussive',
  },
  unlock: {
    waveform: 'triangle',  // Warm, satisfying
    frequency: [
      220, 196, 220,       // Low "ka-chunk" mechanism (back and forth)
      440, 659, 880, 1175  // Rising victorious chime (A-E-A-D)
    ],  // Two-phase: mechanical lock → triumphant unlock
    duration: 0.35,  // Long enough to savor the satisfaction
    volume: 0.46,  // Strong presence - this is a reward moment
    envelope: 'sustained',
  },
  swoosh: {
    waveform: 'sine',  // Pure, soft whoosh
    frequency: [
      350, 600, 900, 1100,   // Gentle rise (approaching)
      950, 700, 450, 250     // Smooth fall (passing by)
    ],  // Soft doppler: gentle motion arc
    duration: 0.15,  // Smooth, unhurried
    volume: 0.36,  // Softer - background motion
    envelope: 'percussive',
  },
  hit: {
    waveform: 'sawtooth',  // Dense harmonics for impact texture
    frequency: [
      450, 400, 350,       // Tight mid-range cluster (main impact body)
      300, 250, 200,       // Lower cluster (weight/thump)
      280, 340, 420        // Quick rising "ting" (satisfaction/success)
    ],  // Impact thump + rising satisfaction (you landed it!)
    duration: 0.06,  // Slightly longer for satisfaction tail
    volume: 0.56,  // Strong and rewarding
    envelope: 'percussive',
  },
};

/**
 * Check if a value is a known preset name.
 */
export function isPreset(value: unknown): value is SynthPreset {
  return typeof value === 'string' && value in PRESET_DEFINITIONS;
}

/**
 * Check if a value is a synth definition object.
 */
export function isSynthDefinition(value: unknown): value is SynthDefinition {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    ('waveform' in value || 'frequency' in value || 'duration' in value)
  );
}

/**
 * Generates a WAV blob URL from a synth definition.
 * This allows procedural sounds to be played via Howler.js (HTML5 Audio)
 * for better mobile reliability and silent mode bypass.
 * 
 * @param definition - The sound definition (preset or custom)
 * @returns Promise<string> - Data URL of the generated WAV file
 */
export async function generateWavUrl(definition: SynthDefinition): Promise<string> {
  const {
    waveform = 'square',
    frequency = 440,
    duration = 0.1,
    volume: presetVolume = 1,
    envelope = 'percussive',
  } = definition;

  const sampleRate = 48000;
  const numSamples = Math.floor(sampleRate * duration);
  
  // Create offline context to render the audio
  const offlineCtx = new OfflineAudioContext(1, numSamples, sampleRate);
  
  const frequencies = Array.isArray(frequency) ? frequency : [frequency];
  const gainNode = offlineCtx.createGain();
  gainNode.connect(offlineCtx.destination);
  
  // Apply global procedural volume scaling + preset volume + envelope
  const scaledVolume = presetVolume * PROCEDURAL_VOLUME_SCALE;
  
  const attackTime = envelope === 'percussive' ? 0.01 : 0.05;
  const releaseTime = envelope === 'percussive' ? 0.05 : 0.1;
  
  gainNode.gain.setValueAtTime(0, 0);
  gainNode.gain.linearRampToValueAtTime(scaledVolume, attackTime);
  gainNode.gain.linearRampToValueAtTime(scaledVolume * 0.7, duration - releaseTime);
  gainNode.gain.linearRampToValueAtTime(0, duration);
  
  // Generate oscillators
  if (frequencies.length === 1) {
    const osc = offlineCtx.createOscillator();
    osc.type = waveform;
    osc.frequency.setValueAtTime(frequencies[0], 0);
    osc.connect(gainNode);
    osc.start(0);
    osc.stop(duration);
  } else {
    // Arpeggio: play each frequency sequentially
    const timePerNote = duration / frequencies.length;
    frequencies.forEach((freq, index) => {
      const osc = offlineCtx.createOscillator();
      osc.type = waveform;
      const startTime = index * timePerNote;
      const endTime = startTime + timePerNote;
      osc.frequency.setValueAtTime(freq, startTime);
      osc.connect(gainNode);
      osc.start(startTime);
      osc.stop(endTime);
    });
  }
  
  // Render to buffer
  const audioBuffer = await offlineCtx.startRendering();
  
  // Convert to WAV
  const wavBlob = audioBufferToWav(audioBuffer);
  return URL.createObjectURL(wavBlob);
}

/**
 * Convert AudioBuffer to WAV Blob
 * Simple 16-bit PCM WAV encoder
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const data = buffer.getChannelData(0); // Mono
  const dataLength = data.length * bytesPerSample;
  const bufferLength = 44 + dataLength;
  
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  
  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  
  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset, int16, true);
    offset += 2;
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Plays a procedural sound using the Web Audio API.
 * @deprecated Use generateWavUrl + Howler instead for mobile reliability
 * @param audioContext - The AudioContext to use
 * @param definition - The sound definition (preset or custom)
 * @param volume - Playback volume (0-1)
 * @returns A function to stop the sound early
 */
export function playProceduralSound(
  audioContext: AudioContext,
  definition: SynthDefinition,
  volume: number = 1
): () => void {
  const {
    waveform = 'square',
    frequency = 440,
    duration = 0.1,
    volume: presetVolume = 1,  // Use preset volume if defined
    envelope = 'percussive',
  } = definition;
  
  // Multiply preset volume by passed volume for proper layering
  const finalVolume = volume * presetVolume;

  const now = audioContext.currentTime;
  const frequencies = Array.isArray(frequency) ? frequency : [frequency];
  
  // Create gain node for volume control
  const gainNode = audioContext.createGain();
  gainNode.connect(audioContext.destination);
  
  // Apply envelope
  const attackTime = envelope === 'percussive' ? 0.01 : 0.05;
  const releaseTime = envelope === 'percussive' ? 0.05 : 0.1;
  
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(finalVolume, now + attackTime);
  gainNode.gain.linearRampToValueAtTime(
    finalVolume * 0.7,
    now + duration - releaseTime
  );
  gainNode.gain.linearRampToValueAtTime(0, now + duration);
  
  // Create oscillators for each frequency (for arpeggios/sweeps)
  const oscillators: OscillatorNode[] = [];
  
  if (frequencies.length === 1) {
    // Single frequency - simple tone
    const osc = audioContext.createOscillator();
    osc.type = waveform;
    osc.frequency.setValueAtTime(frequencies[0], now);
    osc.connect(gainNode);
    osc.start(now);
    osc.stop(now + duration);
    oscillators.push(osc);
  } else {
    // Multiple frequencies - play as arpeggio or sweep
    const timePerNote = duration / frequencies.length;
    
    frequencies.forEach((freq, index) => {
      const osc = audioContext.createOscillator();
      osc.type = waveform;
      
      const startTime = now + (index * timePerNote);
      const endTime = startTime + timePerNote;
      
      osc.frequency.setValueAtTime(freq, startTime);
      osc.connect(gainNode);
      osc.start(startTime);
      osc.stop(endTime);
      oscillators.push(osc);
    });
  }
  
  // Return stop function
  return () => {
    oscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {
        // Already stopped
      }
    });
  };
}

/**
 * Resolve a preset name or synth definition to a SynthDefinition.
 * For presets, includes version string for cache busting during development.
 */
export function resolveDefinition(value: SynthPreset | SynthDefinition): SynthDefinition {
  if (isPreset(value)) {
    return { ...PRESET_DEFINITIONS[value], _version: PRESET_VERSION } as SynthDefinition;
  }
  return value;
}

