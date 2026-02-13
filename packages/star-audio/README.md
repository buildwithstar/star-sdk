# Star Audio

A simple sound manager for web games that "just works" on mobile.

`star-audio` solves the 90% use case for game audio: SFX playback and BGM crossfades, with a mobile-first design that handles browser audio unlocking automatically. It's designed to be predictable, easy to use, and LLM-friendly.

**Powered by the battle-tested [Howler.js](https://howlerjs.com/) core.**

This package is part of the **Star SDK**.

## Features

- **Bulletproof:** Missing audio files won't crash your game - errors are logged but never thrown.
- **Mobile-Safe by Default:** Automatically handles audio context unlocking on user interaction. Plays sound even when the device's silent/ringer switch is on.
- **Tiny API Surface:** A small, guessable API (`play`, `music.crossfadeTo`, `setMute`). No try/catch needed.
- **Two-Bus Mixer:** Simple `music` and `sfx` groups for easy volume control.
- **Seamless Music Crossfades:** Built-in helpers for smooth background music transitions.
- **SSR-Safe:** Can be imported in server-side environments without errors.
- **Single Dependency:** Powered by Howler.js for maximum reliability.

## Install

```bash
yarn add star-audio
# or
npm install star-audio
```

## Quick Starts

### 1. Vanilla JS (60 seconds)

This is the fastest way to get started. Serve an `index.html` file and add the following.

```html
<div id="root" style="height:100vh; display: grid; place-items: center;">Tap anywhere</div>
<script type="module">
  import createAudio from 'star-audio';

  // Create an audio manager. 
  // 'auto' unlocks audio on the first user interaction.
  // 'autostart' will play 'music.theme' once unlocked.
  const audio = createAudio({
    unlockWith: 'auto',
    autostart: { id: 'music.theme', crossfadeSec: 1 }
  });

  // Preload your audio assets.
  await audio.preload({
    'music.theme': ['/audio/theme.m4a', '/audio/theme.mp3'],
    'sfx.tap':     ['/audio/tap.mp3']
  });

  // Play a sound effect on user interaction.
  document.getElementById('root').addEventListener('pointerdown', () => {
    audio.play('sfx.tap', { volume: 0.9 }); // alias: audio.playSound('sfx.tap')
  });
</script>
```

### 2. Next.js / React (Client Component)

In a React component, it's best to create the audio instance once with `useMemo`.

```tsx
/* app/game/page.tsx */
"use client";
import { useEffect, useMemo } from 'react';
import { createStarAudio } from 'star-audio';

export default function Game() {
  const audio = useMemo(() => createStarAudio({
    unlockWith: 'auto',
    autostart: { id: 'music.theme', crossfadeSec: 1 },
    suspendOnHidden: true, // Pauses audio when tab is not visible
  }), []);

  useEffect(() => {
    // Preload assets when the component mounts.
    (async () => {
      await audio.preload({
        'music.theme': ['/audio/theme.m4a', '/audio/theme.mp3'],
        'sfx.tap':     ['/audio/tap.mp3']
      });
    })();

    // Clean up the audio instance when the component unmounts.
    return () => audio.destroy();
  }, [audio]);

  return (
    <div 
      className="h-screen w-screen" 
      onPointerDown={() => audio.play('sfx.tap', { volume: 0.9 })}
    >
      Tap to play
    </div>
  );
}
```

## Common Recipes

### Crossfade Background Music

```ts
await audio.preload({ 'bgm.title': ['/music/title.m4a'] });

// Fade from the current track (or silence) to the title music over 1.5 seconds.
await audio.music.crossfadeTo('bgm.title', { duration: 1.5 });
```

### Volumes & Mute

The volume and mute state are automatically persisted to `localStorage`.

```ts
// Set music volume to 60% with a 300ms fade.
audio.setMusicVolume(0.6, { durationMs: 300 });

// Set SFX volume to 80% instantly.
audio.setSfxVolume(0.8);

// Toggle mute for all audio.
audio.toggleMute();
```

### Pause/Resume (e.g., for a pause menu)

```ts
// Suspend the audio context.
await audio.pause();

// Resume the audio context.
await audio.resume();
```

### Limit SFX Overlap

To prevent audio clipping from too many overlapping sounds, you can limit the number of concurrent SFX voices.

```ts
// Only allow a maximum of 16 sound effects to play at once.
const audio = createAudio({ maxSfxVoices: 16 });
```

## Error Handling Philosophy

Star Audio is designed to **never crash your game**. All loading methods (`preload()`, `load()`) gracefully handle missing or corrupt audio files:

```ts
// ✅ This never throws - even if the file doesn't exist!
await audio.preload({
  'sfx.coin': '/missing.mp3',      // ⚠️  Logs warning, continues
  'sfx.jump': '/audio/jump.mp3'    // ✅ Loads successfully
});

// Game continues working with the sounds that did load
audio.play('sfx.jump');  // ✅ Works
audio.play('sfx.coin');  // ⚠️  Silently fails (already warned during preload)
```

**No try/catch needed.** Failed audio loads are logged to the console with clear warnings, but your game keeps running.

If you need programmatic error handling, listen to the `'error'` event:

```ts
audio.on('error', () => {
  console.log('An audio file failed to load, but the game is still running!');
});
```

## Known Limitations

`star-audio` is designed to solve the 90% use case for web game audio. The current implementation (v1.x) has the following limitations:

- **No SFX voice limiting**: The `maxSfxVoices` option is accepted but not enforced. In practice, browsers limit concurrent audio to ~30-50 voices.
- **No micro-ducking**: Background music does not automatically reduce volume when sound effects play.
- **No volume ramping**: The `durationMs` parameter in `setMusicVolume()` and `setSfxVolume()` is accepted but ignored. Volume changes are instant.
- **No scheduled playback**: The `when`, `offset`, and `duration` parameters in `PlayOptions` are not currently implemented.
- **Pause/Resume behavior**: Only music is automatically resumed when calling `resume()` after `pause()`. Sound effects that were playing will not resume.

These limitations reflect the current Howler.js wrapper implementation. If you need any of these features, please open an issue on GitHub to help us prioritize future development.

## Acknowledgements

The reliability and robustness of `star-audio`, especially on mobile devices, is made possible by the fantastic work of the developers behind [Howler.js](https://howlerjs.com/). We use the Howler core to handle the complexities of cross-browser audio, allowing us to provide a simpler, game-focused API on top of a battle-tested foundation.
