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

Star.game(g => {
  const { width, height, ctx } = g;
  let score = 0;

  Star.audio.preload({ coin: 'coin', jump: 'jump' });

  g.loop((dt) => {
    // Input (polling — check once per frame)
    if (g.tap) {
      score += 10;
      Star.audio.play('coin');
    }

    // Draw
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#fff';
    ctx.font = '24px sans-serif';
    ctx.fillText(`Score: ${score}`, 20, 40);
  });
});
```

## Common Patterns

### Game Over Screen with Leaderboard

Use `g.tap` in the loop with if/else for priority — check buttons first, then general tap:

```javascript
const lbBtn = { x: width / 2 - 120, y: height / 2 + 20, w: 240, h: 50 };
const restartBtn = { x: width / 2 - 120, y: height / 2 + 90, w: 240, h: 50 };

function inRect(tap, r) {
  return tap.x >= r.x && tap.x <= r.x + r.w && tap.y >= r.y && tap.y <= r.y + r.h;
}

g.loop((dt) => {
  // Input
  if (g.tap) {
    if (state === 'gameover') {
      if (inRect(g.tap, lbBtn)) {
        Star.leaderboard.show();
      } else if (inRect(g.tap, restartBtn)) {
        startGame();
      }
    } else if (state === 'playing') {
      jump();
    } else if (state === 'menu') {
      startGame();
    }
  }

  // Update & Draw ...

  if (state === 'gameover') {
    // Draw buttons on canvas
    drawButton(ctx, 'VIEW LEADERBOARD', lbBtn);
    drawButton(ctx, 'PLAY AGAIN', restartBtn);
  }
});

function endGame() {
  state = 'gameover';
  Star.leaderboard.submit(score);
}
```

### Submit with Player Name (Arcade Style)

Let players enter their name on game over — classic arcade feel. If skipped, a guest name is auto-generated.

```javascript
Star.leaderboard.submit(score, { playerName: 'ACE' });  // Custom name
Star.leaderboard.submit(score);                          // Auto guest name
```

Collect the name on game over using `g.ui.render()` for an input field. See `leaderboard.md` Pattern 4.

### Submit Score Only (No UI)

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

### Hover Effects for Canvas Buttons

`g.pointer` tracks position every frame — use it for hover states:

```javascript
g.loop((dt) => {
  const hoverLb = state === 'gameover' && inRect(g.pointer, lbBtn);
  drawButton('VIEW LEADERBOARD', lbBtn, hoverLb ? '#9061f9' : '#7c3aed');
  g.canvas.style.cursor = hoverLb ? 'pointer' : 'default';
});
```

### Coordinate Handling

`g.tap` and `g.pointer` are already in canvas-space coordinates. No conversion needed:

```javascript
g.loop((dt) => {
  if (g.tap) {
    console.log(g.tap.x, g.tap.y);  // Already canvas-space
  }
});
```

## Don't Do This

- **Don't** create canvas manually - use `Star.game()`
- **Don't** use `setInterval` for game loops - use `g.loop()`
- **Don't** destructure Star - use `Star.audio`, `Star.leaderboard`, etc.
- **Don't** invent audio preset names - only 17 exist (see audio.md)
- **Don't** use `canvas.addEventListener('pointerdown', ...)` for input — use `g.tap` / `g.pointer` / `g.released` in the game loop. Polling prevents conflicting handler bugs.
- **Don't** register multiple event handlers for different game states — use ONE `if (g.tap)` block with if/else for priority.

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

Star.game(g => {
  const { width, height, ctx } = g;
  let score = 0;
  let state = 'menu';
  let playerY = height / 2;
  let obstacles = [];
  let spawnTimer = 0;

  Star.audio.preload({ jump: 'jump', coin: 'coin', hurt: 'hurt' });

  const lbBtn = { x: width / 2 - 120, y: height / 2 + 20, w: 240, h: 50 };
  const restartBtn = { x: width / 2 - 120, y: height / 2 + 90, w: 240, h: 50 };

  function inRect(pt, r) {
    return pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h;
  }

  function drawButton(text, r) {
    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, r.x + r.w / 2, r.y + r.h / 2 + 6);
    ctx.textAlign = 'left';
  }

  function startGame() {
    state = 'playing';
    score = 0;
    playerY = height / 2;
    obstacles = [];
    spawnTimer = 0;
  }

  function endGame() {
    state = 'gameover';
    Star.audio.play('hurt');
    Star.leaderboard.submit(score);
  }

  g.loop((dt) => {
    // --- Input (polling) ---
    if (g.tap) {
      if (state === 'menu') {
        startGame();
      } else if (state === 'playing') {
        playerY -= 50;
        Star.audio.play('jump');
      } else if (state === 'gameover') {
        if (inRect(g.tap, lbBtn)) {
          Star.leaderboard.show();
        } else if (inRect(g.tap, restartBtn)) {
          startGame();
        }
      }
    }

    // --- Update ---
    if (state === 'playing') {
      spawnTimer += dt;
      if (spawnTimer > 2) {
        obstacles.push({ x: width, y: Math.random() * height, passed: false });
        spawnTimer = 0;
      }
      obstacles.forEach(obs => {
        obs.x -= 200 * dt;
        if (!obs.passed && obs.x < 50) {
          obs.passed = true;
          score += 10;
          Star.audio.play('coin');
        }
        if (Math.abs(obs.x - 50) < 20 && Math.abs(obs.y - playerY) < 30) {
          endGame();
        }
      });
      obstacles = obstacles.filter(o => o.x > -20);
    }

    // --- Draw ---
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, width, height);

    if (state === 'menu') {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TAP TO START', width / 2, height / 2);
      ctx.textAlign = 'left';
    } else if (state === 'playing' || state === 'gameover') {
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(50, playerY, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a855f7';
      obstacles.forEach(obs => ctx.fillRect(obs.x - 10, obs.y - 25, 20, 50));
      ctx.fillStyle = '#fff';
      ctx.font = '24px sans-serif';
      ctx.fillText(`Score: ${score}`, 20, 40);
    }

    if (state === 'gameover') {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', width / 2, height / 2 - 40);
      ctx.font = 'bold 48px sans-serif';
      ctx.fillText(score, width / 2, height / 2);
      ctx.textAlign = 'left';
      drawButton('VIEW LEADERBOARD', lbBtn);
      drawButton('PLAY AGAIN', restartBtn);
    }
  });
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

No build step needed — deploy your source files directly:

```bash
npx star-sdk deploy
```

This uploads the game to Star hosting and returns a live URL. The deploy command automatically rewrites bare imports (`import Star from 'star-sdk'`) to CDN URLs. Requires `npx star-sdk init` to have been run first (which creates the deploy key in `.starrc`).
