---
name: star-sdk
description: Use when you need a game that works on mobile without audio issues, has leaderboards without building a backend, or needs canvas rendering without DPR/sizing bugs. Handles iOS Safari audio unlocking, DPR scaling, and coordinate conversion automatically.
---

# Star SDK

Browser game development SDK with audio, canvas, and leaderboards.

## Import

```javascript
import Star from 'star-sdk';
```

**CRITICAL:** Always use `import Star from 'star-sdk'` - not destructured imports.

## Setup (Required for Leaderboards)

Before writing any leaderboard code, register your game by running this command in the terminal:

```bash
npx star-sdk init "Your Game Name"
```

This creates a `.starrc` file containing your gameId. Open `.starrc`, copy the `gameId` value, and pass it to `Star.init()`:

```javascript
import Star from 'star-sdk';
Star.init({ gameId: '<paste gameId from .starrc>' });
```

**The gameId is a unique token issued by the Star API. Do not make one up — it will not work. You must run `npx star-sdk init` first and use the gameId it gives you.**

## API Overview

| API | Use When | Docs |
|-----|----------|------|
| `Star.game()` | Game loop, canvas, UI, input | [canvas.md](./canvas.md) |
| `Star.audio` | Sound effects, music | [audio.md](./audio.md) |
| `Star.leaderboard` | Scores, rankings | [leaderboard.md](./leaderboard.md) |

## Quick Start

```javascript
import Star from 'star-sdk';
Star.init({ gameId: '<gameId from .starrc>' }); // run: npx star-sdk init

Star.game(ctx => {
  const { canvas, width, height, ctx: c } = ctx;
  let score = 0;

  // Preload audio
  Star.audio.preload({ coin: 'coin', jump: 'jump' });

  // Game loop
  ctx.loop((dt) => {
    c.fillStyle = '#111827';
    c.fillRect(0, 0, width, height);
    c.fillStyle = '#fff';
    c.font = '24px sans-serif';
    c.fillText(`Score: ${score}`, 20, 40);
  });

  // Input
  canvas.onclick = () => {
    score += 10;
    Star.audio.play('coin');
  };
});
```

## Common Patterns

### Game Over -> Submit Score -> Show Leaderboard

```javascript
function gameOver(finalScore) {
  Star.leaderboard.submit(finalScore);
  Star.leaderboard.show();
}
```

### Lower-is-Better Games (Time, Moves, Golf)

For games where lower scores win, set `sort: 'asc'` in `Star.init()`:

```javascript
Star.init({ gameId: '<gameId from .starrc>', leaderboard: { sort: 'asc' } });

// Submit the raw value — do NOT invert the score
Star.leaderboard.submit(reactionTimeMs);
Star.leaderboard.show();
```

**Do NOT** invert scores to fake ascending order (e.g., `10000 - score`). Use `sort: 'asc'` instead.

### Audio (It Just Works)

Star.audio handles mobile audio unlocking automatically. Just call `play()` - no special handling needed.

```javascript
Star.audio.preload({ coin: 'coin', jump: 'jump' });
Star.audio.play('coin');  // Works on mobile, desktop, everywhere
```

### Coordinate Handling

```javascript
canvas.onclick = (e) => {
  const point = ctx.toStagePoint(e);  // Correct coordinates
  console.log(point.x, point.y);
};
```

## Don't Do This

- **Don't** create canvas manually - use `Star.game()`
- **Don't** use `setInterval` for game loops - use `ctx.loop()`
- **Don't** destructure Star - use `Star.audio`, `Star.leaderboard`, etc.
- **Don't** invent audio preset names - only 17 exist (see audio.md)

## Audio Presets (Full List)

Only these 17 presets exist:
- UI: `beep`, `click`, `select`, `error`, `success`
- Actions: `jump`, `swoosh`, `shoot`, `laser`, `explosion`
- Combat: `hit`, `hurt`
- Collection: `coin`, `pickup`, `bonus`, `unlock`, `powerup`

## Full Game Example

```javascript
import Star from 'star-sdk';
Star.init({ gameId: '<gameId from .starrc>' }); // run: npx star-sdk init

Star.game(ctx => {
  const { canvas, width, height, ctx: c } = ctx;
  let score = 0;
  let gameOver = false;
  let playerY = height / 2;
  let obstacles = [];

  Star.audio.preload({
    jump: 'jump',
    coin: 'coin',
    hurt: 'hurt'
  });

  // Spawn obstacles
  setInterval(() => {
    if (!gameOver) {
      obstacles.push({ x: width, y: Math.random() * height, passed: false });
    }
  }, 2000);

  ctx.loop((dt) => {
    if (gameOver) return;

    // Clear
    c.fillStyle = '#111827';
    c.fillRect(0, 0, width, height);

    // Update obstacles
    obstacles.forEach(obs => {
      obs.x -= 200 * dt;

      // Score when passed
      if (!obs.passed && obs.x < 50) {
        obs.passed = true;
        score += 10;
        Star.audio.play('coin');
      }

      // Collision
      if (Math.abs(obs.x - 50) < 20 && Math.abs(obs.y - playerY) < 30) {
        gameOver = true;
        Star.audio.play('hurt');
        Star.leaderboard.submit(score);
        Star.leaderboard.show();
      }
    });

    // Remove off-screen
    obstacles = obstacles.filter(o => o.x > -20);

    // Draw player
    c.fillStyle = '#3b82f6';
    c.beginPath();
    c.arc(50, playerY, 15, 0, Math.PI * 2);
    c.fill();

    // Draw obstacles
    c.fillStyle = '#a855f7';
    obstacles.forEach(obs => {
      c.fillRect(obs.x - 10, obs.y - 25, 20, 50);
    });

    // Draw score
    c.fillStyle = '#fff';
    c.font = '24px sans-serif';
    c.fillText(`Score: ${score}`, 20, 40);
  });

  // Jump on click/tap
  canvas.onclick = () => {
    if (!gameOver) {
      playerY -= 50;
      Star.audio.play('jump');
    }
  };
});
```

For detailed API documentation, see the linked files above.

## Examples

Complete working games are in the `examples/` directory (also published with the npm package):

- **click-frenzy** — 5-second click speed game with leaderboard
- **dodge** — Avoid falling obstacles, keyboard and touch controls
- **reaction-time** — Test your reflexes over 5 rounds, DOM-based (no canvas)

Each example is a single HTML file, no build step — imports from esm.sh.

## Deploy

When the game is ready, deploy it with one command:

```bash
npx star-sdk deploy
```

This uploads the game to Star hosting and returns a live URL. Requires `npx star-sdk init` to have been run first (which creates the deploy key in `.starrc`).
