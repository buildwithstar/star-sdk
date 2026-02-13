# Star SDK

Unified SDK for game development. Audio, canvas, and leaderboards.

## Import

```javascript
{{internalImport}}
```

## Quick Start

```javascript
Star.game(ctx => {
  const { canvas, width, height, ctx: c } = ctx;
  let score = 0;
  let x = width / 2, y = height / 2;

  // Preload sounds
  Star.audio.preload({
    coin: 'coin',     // Built-in synth preset
    jump: 'jump',
    music: { url: '/audio/music.mp3', group: 'music' }
  });

  // Start background music
  Star.audio.music.crossfadeTo('music');

  // Game loop
  ctx.loop((dt) => {
    // Clear
    c.fillStyle = '#111827';
    c.fillRect(0, 0, width, height);

    // Draw player
    c.fillStyle = '#ef4444';
    c.beginPath();
    c.arc(x, y, 20, 0, Math.PI * 2);
    c.fill();

    // Draw score
    c.fillStyle = '#fff';
    c.font = '24px sans-serif';
    c.fillText(`Score: ${score}`, 20, 40);
  });

  // Input
  canvas.onpointermove = (e) => {
    const p = ctx.toStagePoint(e);
    x = p.x;
    y = p.y;
  };

  canvas.onclick = () => {
    score += 10;
    Star.audio.play('coin');
  };
});
```

## API Reference

### Star.game(setup, options?)

Initialize canvas and game context.

```javascript
Star.game(ctx => {
  const { canvas, width, height, ctx: c, ui } = ctx;

  ctx.loop((dt) => {
    // dt = delta time in seconds
    c.clearRect(0, 0, width, height);
  });

  // Delegated events (safe for dynamic elements)
  ctx.on('click', '.button', (e) => { ... });

  // UI overlay (HTML on top of canvas)
  ui.render(`<div class="score">Score: ${score}</div>`);
}, {
  preset: 'landscape',  // or 'portrait', 'responsive'
  width: 640,           // optional override
  height: 360
});
```

### Star.audio

Procedural sounds and music.

```javascript
// Preload assets
Star.audio.preload({
  coin: 'coin',           // Built-in preset
  laser: 'laser',
  jump: { waveform: 'square', frequency: [200, 400], duration: 0.1 },
  music: { url: '/music.mp3', group: 'music' }
});

// Play sound
Star.audio.play('coin');
Star.audio.play('laser', { volume: 0.5, rate: 1.2 });

// Music control
Star.audio.music.crossfadeTo('music', { duration: 2 });
Star.audio.music.stop(1); // fade out over 1 second

// Volume control
Star.audio.setMusicVolume(0.8);
Star.audio.setSfxVolume(0.9);
Star.audio.toggleMute();
```

**Built-in presets:** `beep`, `coin`, `pickup`, `jump`, `hurt`, `explosion`, `powerup`, `shoot`, `laser`, `error`, `click`, `success`, `bonus`, `select`, `unlock`, `swoosh`, `hit`

### Star.leaderboard

Submit scores and show rankings.

```javascript
// Submit score (async)
const result = await Star.leaderboard.submit(1500);
if (result.success) {
  console.log(`Ranked #${result.rank}!`);
}

// Show platform leaderboard UI
Star.leaderboard.show();

// Fetch scores manually
const { scores, you } = await Star.leaderboard.getScores({
  timeframe: 'weekly',  // or 'all_time'
  limit: 10
});

scores.forEach(s => {
  console.log(`#${s.rank} ${s.playerName}: ${s.score}`);
});
```

## Complete Game Example

```javascript
Star.game(ctx => {
  const { canvas, width, height, ctx: c } = ctx;

  // State
  let player = { x: width / 2, y: height - 50, speed: 300 };
  let enemies = [];
  let bullets = [];
  let score = 0;
  let gameOver = false;

  // Audio
  Star.audio.preload({
    shoot: 'laser',
    explosion: 'explosion',
    hurt: 'hurt'
  });

  // Spawn enemies
  function spawnEnemy() {
    enemies.push({
      x: Math.random() * width,
      y: -20,
      speed: 100 + Math.random() * 100
    });
  }
  setInterval(spawnEnemy, 1000);

  // Game loop
  ctx.loop((dt) => {
    if (gameOver) {
      c.fillStyle = '#000';
      c.fillRect(0, 0, width, height);
      c.fillStyle = '#fff';
      c.font = '32px sans-serif';
      c.textAlign = 'center';
      c.fillText('Game Over!', width / 2, height / 2);
      c.fillText(`Score: ${score}`, width / 2, height / 2 + 40);
      return;
    }

    // Clear
    c.fillStyle = '#111827';
    c.fillRect(0, 0, width, height);

    // Update bullets
    bullets = bullets.filter(b => {
      b.y -= 500 * dt;
      return b.y > 0;
    });

    // Update enemies
    enemies = enemies.filter(e => {
      e.y += e.speed * dt;

      // Check collision with player
      if (Math.hypot(e.x - player.x, e.y - player.y) < 30) {
        Star.audio.play('hurt');
        gameOver = true;
        Star.leaderboard.submit(score);
        Star.leaderboard.show();
      }

      // Check collision with bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        if (Math.hypot(e.x - bullets[i].x, e.y - bullets[i].y) < 20) {
          bullets.splice(i, 1);
          Star.audio.play('explosion');
          score += 100;
          return false;
        }
      }

      return e.y < height + 20;
    });

    // Draw bullets
    c.fillStyle = '#f59e0b';
    bullets.forEach(b => {
      c.fillRect(b.x - 2, b.y - 8, 4, 16);
    });

    // Draw enemies
    c.fillStyle = '#ef4444';
    enemies.forEach(e => {
      c.beginPath();
      c.arc(e.x, e.y, 15, 0, Math.PI * 2);
      c.fill();
    });

    // Draw player
    c.fillStyle = '#3b82f6';
    c.beginPath();
    c.moveTo(player.x, player.y - 20);
    c.lineTo(player.x - 15, player.y + 15);
    c.lineTo(player.x + 15, player.y + 15);
    c.closePath();
    c.fill();

    // Draw score
    c.fillStyle = '#fff';
    c.font = '20px sans-serif';
    c.textAlign = 'left';
    c.fillText(`Score: ${score}`, 10, 30);
  });

  // Controls
  canvas.onpointermove = (e) => {
    const p = ctx.toStagePoint(e);
    player.x = p.x;
  };

  canvas.onclick = () => {
    bullets.push({ x: player.x, y: player.y - 20 });
    Star.audio.play('shoot');
  };
});
```