**Setup (do this first):**

Register your game by running this in the terminal:

```bash
npx star-sdk init "Game Name"
```

This creates a `.starrc` file. Open it, copy the `gameId` value, and use it below. The gameId is a server-issued token — do not invent one. It must come from `npx star-sdk init`.

### Star Leaderboard

**Simple leaderboards for browser games.** Submit scores, show rankings. Never crashes your game.

**Import:**
```javascript
import Star from 'star-sdk';
Star.init({ gameId: '<gameId from .starrc>' });
```

**CRITICAL:** Always use the unified `Star` import — not `createLeaderboard` from `star-leaderboard`.

---

**Quick Start:**

```javascript
import Star from 'star-sdk';
Star.init({ gameId: '<gameId from .starrc>' });

Star.game(({ ctx, width, height, loop, ui, on, canvas }) => {
  let score = 0;
  let state = 'playing';

  function endGame() {
    state = 'gameover';
    // Submit score and show leaderboard
    Star.leaderboard.submit(score);
    Star.leaderboard.show();
  }

  // Game logic...
});
```

**That's it!** The SDK handles:
- Score submission (works for guests and logged-in users)
- Built-in leaderboard UI (modal with rankings)
- Weekly/all-time timeframes

---

**API Reference:**

**Core Methods:**
```javascript
Star.leaderboard.submit(score)                      // Submit score (guest name auto-generated)
Star.leaderboard.submit(score, { playerName })      // Submit with custom player name
Star.leaderboard.show()                             // Show built-in leaderboard UI
Star.leaderboard.getScores(options)                 // Fetch scores for custom UI
```

**Aliases (for discoverability):**
```javascript
Star.leaderboard.submitScore(score)  // Same as submit()
Star.leaderboard.showLeaderboard()   // Same as show()
```

---

**Patterns:**

### Pattern 1: Submit and Show (Most Common)

```javascript
import Star from 'star-sdk';
Star.init({ gameId: '<gameId from .starrc>' });

function gameOver(finalScore) {
  // Fire and forget - simplest approach
  Star.leaderboard.submit(finalScore);
  Star.leaderboard.show();
}
```

### Pattern 2: With Rank Feedback

```javascript
import Star from 'star-sdk';
Star.init({ gameId: '<gameId from .starrc>' });

async function gameOver(finalScore) {
  const { success, rank } = await Star.leaderboard.submit(finalScore);

  if (success && rank) {
    console.log(`You ranked #${rank}!`);
  }

  Star.leaderboard.show();
}
```

### Pattern 3: Leaderboard Button

```javascript
import Star from 'star-sdk';
Star.init({ gameId: '<gameId from .starrc>' });

Star.game(({ ui, on }) => {
  ui.render(`
    <button id="lb-btn">
      View Leaderboard
    </button>
  `);

  on('click', '#lb-btn', (e) => {
    e.stopPropagation();
    Star.leaderboard.show();
  });
});
```

### Pattern 4: Custom Player Names

Players can set their own name for the leaderboard:

```javascript
Star.leaderboard.submit(score, { playerName: 'ACE' });  // Custom name
Star.leaderboard.submit(score);                          // Auto guest name
```

If `playerName` is not provided, a guest name like "Guest1234" is auto-generated.

A natural place to collect the name is on the game over screen (arcade-style "enter your initials"). Use `g.ui.render()` for the input field and `g.on()` for handlers. Call `submitScore()` before `show()` or `startGame()` so the score saves even if the player skips the name input. Store `playerName` outside the loop so it persists across rounds.

### Pattern 5: Custom Leaderboard UI

```javascript
import Star from 'star-sdk';
Star.init({ gameId: '<gameId from .starrc>' });

async function showCustomLeaderboard() {
  const { scores, you, config } = await Star.leaderboard.getScores({
    timeframe: 'weekly',  // or 'all_time'
    limit: 10
  });

  // Render your own UI
  scores.forEach(entry => {
    console.log(`#${entry.rank} ${entry.playerName}: ${entry.score}`);
  });

  if (you) {
    console.log(`Your rank: #${you.rank}`);
  }
}
```

### Pattern 6: Full Game Example

```javascript
import Star from 'star-sdk';
Star.init({ gameId: '<gameId from .starrc>' });

Star.game((g) => {
  const { ctx, width, height, ui, on } = g;
  let score = 0;
  let state = 'menu';

  function startGame() {
    state = 'playing';
    score = 0;
    updateUI();
  }

  function endGame() {
    state = 'gameover';
    Star.leaderboard.submit(score);
    updateUI();
  }

  // UI with leaderboard button
  function updateUI() {
    if (state === 'gameover') {
      ui.render(`
        <div class="h-full flex flex-col items-center justify-center text-white">
          <div class="text-3xl mb-4">GAME OVER</div>
          <div class="text-6xl mb-4">${score}</div>
          <button id="lb-btn" class="px-6 py-3 mb-4 bg-purple-600 rounded-lg">
            VIEW LEADERBOARD
          </button>
          <div class="text-xl animate-pulse">TAP TO RESTART</div>
        </div>
      `);
    }
  }

  on('click', '#lb-btn', (e) => {
    e.stopPropagation();
    Star.leaderboard.show();
  });

  g.loop((dt) => {
    if (g.tap) {
      if (state === 'menu' || state === 'gameover') startGame();
    }
    // Game logic...
  });
});
```

---

**Lower-is-Better Games (Time, Moves, Golf):**

For games where lower scores win, set `sort: 'asc'` in `Star.init()`:

```javascript
Star.init({ gameId: '<gameId from .starrc>', leaderboard: { sort: 'asc' } });

// Submit the raw value — do NOT invert the score
Star.leaderboard.submit(reactionTimeMs);
Star.leaderboard.show();
```

**Do NOT** invert scores to fake ascending order (e.g., `10000 - score`). Use `sort: 'asc'` instead.

---

**getScores Options:**

```javascript
const data = await Star.leaderboard.getScores({
  timeframe: 'weekly',  // 'weekly' (default) or 'all_time'
  limit: 10             // Number of scores (default: 10)
});

// Returns:
{
  scores: [{ id, playerName, score, rank, submittedAt }],
  config: { sort: 'DESC', valueType: 'score' },
  timeframe: 'weekly',
  you: { ... } | null,      // Your score if outside top scores
  weekResetTime: 1234567890 // Unix ms when weekly resets
}
```

---

**Tips:**

1. **Call `submit()` before `show()`** - Ensures your score appears immediately in the leaderboard.

2. **Fire and forget is fine** - `submit()` returns a Promise but you don't need to await it.

3. **Use `show()` for built-in UI** - It's the easiest way. Use `getScores()` only if you need custom rendering.

4. **Don't store leaderboard state** - Just call the SDK methods when needed. The platform handles caching.

6. **`show()` is safe to call repeatedly** - It handles open/close state internally. Do not add your own `shown` flag; it will prevent the player from reopening the leaderboard.

5. **Works for guests** - Guests get an auto-generated name like "Guest1234". Pass `{ playerName }` to let players choose their own name.
