# Star SDK

Unified SDK for game development. Audio, canvas, and leaderboards.

## Import

```javascript
{{internalImport}}
```

## Quick Start

```javascript
Star.game(g => {
  const { ctx, width, height } = g;
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

  // Game loop — input and drawing happen here
  g.loop((dt) => {
    // Input (polling — coordinates are canvas-space, automatic)
    if (g.tap) {
      score += 10;
      Star.audio.play('coin');
    }
    // Track pointer for player position
    x = g.pointer.x;
    y = g.pointer.y;

    // Clear
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, width, height);

    // Draw player
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();

    // Draw score
    ctx.fillStyle = '#fff';
    ctx.font = '24px sans-serif';
    ctx.fillText(`Score: ${score}`, 20, 40);
  });
});
```

## API Reference

### Star.game(setup, options?)

Initialize canvas and game context with input polling.

```javascript
Star.game(g => {
  const { ctx, width, height, ui } = g;

  g.loop((dt) => {
    // Input polling (canvas-space coordinates, automatic)
    if (g.tap) { /* tap/click: g.tap.x, g.tap.y */ }
    if (g.pointer.down) { /* held: g.pointer.x, g.pointer.y */ }

    // dt = delta time in seconds
    ctx.clearRect(0, 0, width, height);
  });

  // Delegated events for HTML UI buttons
  g.on('click', '.button', (e) => { ... });

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
Star.game(g => {
  const { ctx, width, height } = g;

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
  g.loop((dt) => {
    // Input (polling — coordinates are canvas-space, automatic)
    player.x = g.pointer.x;  // Follow pointer
    if (g.tap && !gameOver) {
      bullets.push({ x: player.x, y: player.y - 20 });
      Star.audio.play('shoot');
    }

    if (gameOver) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#fff';
      ctx.font = '32px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over!', width / 2, height / 2);
      ctx.fillText(`Score: ${score}`, width / 2, height / 2 + 40);
      return;
    }

    // Clear
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, width, height);

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
    ctx.fillStyle = '#f59e0b';
    bullets.forEach(b => {
      ctx.fillRect(b.x - 2, b.y - 8, 4, 16);
    });

    // Draw enemies
    ctx.fillStyle = '#ef4444';
    enemies.forEach(e => {
      ctx.beginPath();
      ctx.arc(e.x, e.y, 15, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw player
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(player.x, player.y - 20);
    ctx.lineTo(player.x - 15, player.y + 15);
    ctx.lineTo(player.x + 15, player.y + 15);
    ctx.closePath();
    ctx.fill();

    // Draw score
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 10, 30);
  });
});
```