# Star SDK

Browser game SDK with built-in leaderboards (no backend needed), mobile-safe audio, and canvas helpers. Works on iOS Safari. Perfect for AI-generated games.

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
Star SDK works on mobile out of the box. Leaderboards are included — no backend needed.

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

## TypeScript

Star SDK ships with full type definitions.

```typescript
import Star from 'star-sdk';

Star.init({ gameId: '<gameId from .starrc>' });

Star.game((ctx) => {
  const { canvas, width, height, ctx: c } = ctx;
  let score: number = 0;

  Star.audio.preload({ coin: 'coin', jump: 'jump' });

  ctx.loop((dt: number) => {
    c.fillStyle = '#111827';
    c.fillRect(0, 0, width, height);
    c.fillStyle = '#fff';
    c.font = '24px sans-serif';
    c.fillText(`Score: ${score}`, 20, 40);
  });

  canvas.onclick = () => {
    score += 10;
    Star.audio.play('coin');
  };
});
```

## Built with Star SDK

- [Stick Slaughter](https://buildwithstar.com/games/02a46501-054d-4626-9f63-f955efd2e22e) — Battle waves of stick figures in this action game
- [Cozy Noodle Shop](https://buildwithstar.com/games/a5cb0689-c7a3-49e0-a36f-813da7db631e) — Run a noodle stand, take orders, cook bowls
- [Moonlit Carnage](https://buildwithstar.com/games/589d2d1f-5e9e-4554-8072-a6a348ef7160) — Vampire survivors-style autoshooter
- [Library Larry](https://buildwithstar.com/games/8ca15996-06ce-44df-914c-b4a7115eac0a) — Help Larry organize the library
- [One-Shotted Pong](https://buildwithstar.com/games/3cc90ecd-836a-498e-a3eb-7964e761ace1) — Classic pong with a twist

Built something with Star SDK? [Share it with us!](https://buildwithstar.com)

## AI-Friendly

Star SDK ships with skill files that teach AI coding tools how to use the SDK correctly. When an LLM reads the `skills/` directory, it learns the full API, common patterns, and pitfalls to avoid.

```bash
npx star-sdk install          # Claude Code (default)
npx star-sdk install cursor   # Cursor
npx star-sdk install codex    # OpenAI Codex
```

This is what "built by LLMs, for LLMs" means — Star SDK is designed to be used autonomously by AI agents, not just by humans reading docs.

## Deploy to Star

Deploy your game with one command. Free hosting, no configuration needed.

- Free hosting with a shareable link
- Leaderboards work automatically

```bash
npx star-sdk deploy
```

## Documentation

Full documentation at [buildwithstar.com/docs/sdk](https://buildwithstar.com/docs/sdk)

## License

MIT
