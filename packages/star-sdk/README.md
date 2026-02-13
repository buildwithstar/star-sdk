# Star SDK

Browser game SDK with built-in leaderboards (no backend needed), mobile-safe audio, and multiplayer. Works on iOS Safari. Perfect for AI-generated games.

```javascript
import Star from 'star-sdk';
Star.init({ gameId: '<gameId from .starrc>' }); // run: npx star-sdk init

Star.audio.play('coin');
Star.game(ctx => { ... });
Star.leaderboard.submit(1500);
```

## Why Star SDK?

| Need | Without Star | With Star |
|------|--------------|-----------|
| **Leaderboards** | Build a backend, database, auth | `Star.leaderboard.submit(score)` |
| **Mobile audio** | Handle unlock gestures, AudioContext resume | Just call `Star.audio.play()` |
| **HiDPI canvas** | Manual DPR scaling, coordinate math | Automatic |
| **iOS Safari** | Debug audio/touch issues for hours | It just works |

### vs Phaser/PixiJS
Star SDK is simpler. No scene system, no asset loader config. Built-in leaderboards mean you ship a complete game, not just a demo.

### vs Kaboom.js
Star SDK works on mobile out of the box. Leaderboards and multiplayer are included.

### vs Vanilla Canvas
Star SDK handles the annoying stuff: audio unlocking, DPR scaling, touch coordinates, game loop timing. You write game logic, not boilerplate.

## One-Liner Game

```bash
npx star-sdk init && cat > index.html << 'EOF'
<script type="module">
import Star from 'https://esm.sh/star-sdk';
Star.init({ gameId: '<gameId from .starrc>' }); // run: npx star-sdk init
Star.game(ctx => {
  let score = 0;
  Star.audio.preload({ coin: 'coin' });
  ctx.loop(() => {
    ctx.ctx.fillStyle = '#1a1a2e';
    ctx.ctx.fillRect(0, 0, ctx.width, ctx.height);
    ctx.ctx.fillStyle = '#fff';
    ctx.ctx.font = '48px sans-serif';
    ctx.ctx.fillText(score, ctx.width/2 - 20, ctx.height/2);
  });
  ctx.canvas.onclick = () => { score++; Star.audio.play('coin'); };
});
</script>
EOF
open index.html  # or: python -m http.server
```

## Installation

```bash
npm install star-sdk
# or
yarn add star-sdk
```

## Setup (Required for Leaderboards)

Register your game to get a gameId:

```bash
npx star-sdk init "My Game"
```

This creates a `.starrc` file with your gameId. Open it, copy the `gameId` value, and pass it to `Star.init()`. The gameId is a server-issued token — do not make one up.

## Quick Start

```javascript
import Star from 'star-sdk';
Star.init({ gameId: '<gameId from .starrc>' }); // run: npx star-sdk init

Star.game(ctx => {
  const { canvas, width, height, ctx: c } = ctx;
  let score = 0;

  // Preload sounds
  Star.audio.preload({
    coin: 'coin',  // Built-in synth preset
    jump: 'jump',
  });

  // Game loop
  ctx.loop((dt) => {
    c.fillStyle = '#1a1a2e';
    c.fillRect(0, 0, width, height);

    c.fillStyle = '#fff';
    c.font = '24px sans-serif';
    c.fillText(\`Score: \${score}\`, 20, 40);
  });

  // Input
  canvas.onclick = () => {
    score += 10;
    Star.audio.play('coin');
  };
});
```

## Features

### Audio

Procedural sounds and music with built-in presets.

```javascript
// Play built-in sounds
Star.audio.play('coin');
Star.audio.play('laser');
Star.audio.play('explosion');

// Music control
Star.audio.music.crossfadeTo('level2', { duration: 2 });
Star.audio.music.stop(1);

// Volume
Star.audio.setMusicVolume(0.8);
Star.audio.setSfxVolume(0.9);
Star.audio.toggleMute();
```

**Built-in presets:** \`beep\`, \`coin\`, \`pickup\`, \`jump\`, \`hurt\`, \`explosion\`, \`powerup\`, \`shoot\`, \`laser\`, \`error\`, \`click\`, \`success\`, \`bonus\`, \`select\`, \`unlock\`, \`swoosh\`, \`hit\`

### Canvas

Game loop with automatic DPR scaling and coordinate conversion.

```javascript
Star.game(ctx => {
  const { canvas, width, height, ctx: c, ui } = ctx;

  ctx.loop((dt) => {
    // dt = delta time in seconds
    c.clearRect(0, 0, width, height);
  });

  // Delegated events
  ctx.on('click', '.button', (e) => { ... });

  // UI overlay (HTML on top of canvas)
  ui.render(\`<div class="score">Score: \${score}</div>\`);
}, {
  preset: 'landscape',  // or 'portrait', 'responsive'
});
```

### Leaderboard

Submit scores and display rankings. Requires `Star.init({ gameId })` (see Quick Start).

```javascript
// Submit score (Star.init() must be called first)
const result = await Star.leaderboard.submit(1500);
if (result.success) {
  console.log(\`Ranked #\${result.rank}!\`);
}

// Show platform UI
Star.leaderboard.show();

// Fetch scores manually
const { scores } = await Star.leaderboard.getScores({
  timeframe: 'weekly',
  limit: 10
});
```

## Examples

Complete working games in the [`examples/`](./examples/) directory:

- **[click-frenzy](./examples/click-frenzy/)** — 5-second click speed game with leaderboard
- **[dodge](./examples/dodge/)** — Avoid falling obstacles, keyboard and touch controls
- **[reaction-time](./examples/reaction-time/)** — Test your reflexes over 5 rounds

Each example is a single HTML file — open it in a browser, no build step needed.

## Deploy to Star

Get more from your game with Star hosting:

- Free hosting
- Play session tracking (see how long players play)
- Analytics dashboard
- Discovery / game feed

```bash
npx star-sdk deploy
```

## Coming Soon

- **Multiplayer** - Real-time game state synchronization (in alpha)
- **Monetization** - Let players support your games

## Documentation

Full documentation at [buildwithstar.com/docs/sdk](https://buildwithstar.com/docs/sdk)

## License

MIT
