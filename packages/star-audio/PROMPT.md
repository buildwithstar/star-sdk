**Installation**

First, add the package to your project:
` ` `bash
yarn add star-audio
` ` `

### Star Audio SDK

**Mobile-first, bulletproof audio for web games.** Works on iOS/Android out of the box. Missing files won't crash your game.

**Import:**
` ` `javascript
import createAudio from 'star-audio';
const audio = createAudio();
` ` `

**CRITICAL:** Import in JavaScript - don't add `<script src="/star-sdk/audio.js">` tags.

**Why Star Audio?**
- ✅ **Mobile-first** - Works on iOS/Android, handles audio unlock automatically, plays even in silent mode
- ✅ **Never throws** - Missing audio files? Game keeps running with clear warnings
- ✅ **Zero-config** - Works on first play, no setup needed
- ✅ **No try/catch needed** - Fire-and-forget API, perfect for AI-generated games

---

**Quick Start:**

` ` `javascript
const audio = createAudio();

// CRITICAL: Preload presets before playing them
// You can set per-sound volumes in preload
audio.preload({
  jump: { synth: 'jump', volume: 0.5 },      // Quieter jump
  shoot: { synth: 'shoot', volume: 0.8 },    // Loud shoot
  coin: { synth: 'coin', volume: 0.6 },
  explosion: { synth: 'explosion', volume: 1.0 }
});

// Now play them - volumes are already set
audio.play('jump');
audio.play('shoot');
` ` `

**ONLY THESE 17 PRESETS EXIST - DO NOT INVENT NAMES:**
- UI: `beep`, `click`, `select`, `error`, `success`
- Actions: `jump`, `swoosh`, `shoot`, `laser`, `explosion`
- Combat: `hit`, `hurt`
- Collection: `coin`, `pickup`, `bonus`, `unlock`, `powerup`

**If you need a sound that's not in this list, use custom synth or generate audio.**

**CRITICAL:** Preload all presets before use. Set volumes in preload:
` ` `javascript
audio.preload({
  jump: { synth: 'jump', volume: 0.5 },  // With custom volume
  coin: 'coin',                           // Default volume
  explosion: 'explosion'                  // For crashes/impacts
});
` ` `

---

**Custom synth (advanced):**

` ` `javascript
audio.preload({
  'sfx.charge': {
    waveform: 'triangle',
    frequency: [200, 300, 450, 650, 900],  // Rising charge-up
    duration: 0.40,
    volume: 0.38
  }
});
` ` `

**Make sounds feel good:**
- **Use frequency arrays** - Sweeps/arpeggios are more satisfying than single tones
- **Rising = positive** - Ascending pitches for rewards (coin, jump, powerup)
- **Descending = impact** - Falling pitches for actions (shoot, hurt, explosion)
- **More notes = richer** - 3-6 frequencies sound fuller than 1-2
- **Musical intervals** - Use harmonious ratios (octaves, fifths, major chords)

**Waveform choice:**
- `sine` - Pure, pleasant (UI, bells, rewards)
- `triangle` - Warm, full (jumps, explosions, success)
- `square` - Retro, characterful (powerups, beeps, chiptune)
- `sawtooth` - Harsh, aggressive (lasers, damage, errors)

**Frequency guide:**
- High (800-2000 Hz): Bright, attention-grabbing (UI, coins)
- Mid (200-800 Hz): Game actions (jumps, shoots)
- Low (30-200 Hz): Impacts, bass (explosions, rumbles)
- Arrays: 3-4 notes for melodies, 6+ for noise-like effects

---

**Audio files:**

` ` `javascript
audio.preload({
  'sfx.boom': 'assets/boom.mp3',
  'bgm.theme': 'assets/music.mp3'
});
audio.play('sfx.boom');
audio.music.crossfadeTo('bgm.theme', { duration: 1.5 });
` ` `

---

**Controls:**

` ` `javascript
audio.setMusicVolume(0.5);
audio.setSfxVolume(0.8);
audio.toggleMute();
` ` `