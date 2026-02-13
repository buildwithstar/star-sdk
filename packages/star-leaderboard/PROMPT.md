**Installation**

```bash
yarn add star-leaderboard
```

**Setup (do this first):**

Register your game by running this in the terminal:

```bash
npx star-sdk init "Game Name"
```

This creates a `.starrc` file. Open it, copy the `gameId` value, and use it below. The gameId is a server-issued token — do not invent one. It must come from `npx star-sdk init`.

### Star Leaderboard SDK

**Simple leaderboards for Star games.** Submit scores, show rankings, share results. Never crashes your game.

**Import:**
```javascript
import { createLeaderboard } from 'star-leaderboard';
const leaderboard = createLeaderboard({ gameId: '<gameId from .starrc>' });
```

**CRITICAL:** Import in JavaScript - don't add `<script>` tags.

---

**Quick Start:**

```javascript
import { createLeaderboard } from 'star-leaderboard';
import { game } from 'star-canvas';

const leaderboard = createLeaderboard({ gameId: '<gameId from .starrc>' });

game(({ ctx, width, height, loop, ui, on, canvas }) => {
  let score = 0;
  let state = 'playing';

  function endGame() {
    state = 'gameover';
    // Submit score and show leaderboard
    leaderboard.submit(score);
    leaderboard.show();
  }

  // Game logic...
});
```

**That's it!** The SDK handles:
- Score submission (works for guests and logged-in users)
- Leaderboard UI (modal with rankings)
- Weekly/all-time timeframes
- AI-detected scoring (score/time/moves - higher or lower is better)

---

**API Reference:**

**Core Methods:**
```javascript
leaderboard.submit(score)       // Submit score, returns Promise<{ success, rank, scoreId }>
leaderboard.show()              // Show leaderboard UI
leaderboard.getScores(options)  // Fetch scores for custom UI
leaderboard.share(options)      // Generate shareable link
```

**Properties:**
```javascript
leaderboard.ready    // true when SDK is initialized
leaderboard.gameId   // Current game ID
```

**Aliases (for discoverability):**
```javascript
leaderboard.submitScore(score)  // Same as submit()
leaderboard.showLeaderboard()   // Same as show()
```

---

**Patterns:**

### Pattern 1: Submit and Show (Most Common)

```javascript
import { createLeaderboard } from 'star-leaderboard';

const leaderboard = createLeaderboard({ gameId: '<gameId from .starrc>' });

function gameOver(finalScore) {
  // Fire and forget - simplest approach
  leaderboard.submit(finalScore);
  leaderboard.show();
}
```

### Pattern 2: With Rank Feedback

```javascript
import { createLeaderboard } from 'star-leaderboard';

const leaderboard = createLeaderboard({ gameId: '<gameId from .starrc>' });

async function gameOver(finalScore) {
  const { success, rank } = await leaderboard.submit(finalScore);

  if (success && rank) {
    console.log(`You ranked #${rank}!`);
  }

  leaderboard.show();
}
```

### Pattern 3: Leaderboard Button

```javascript
import { createLeaderboard } from 'star-leaderboard';
import { game } from 'star-canvas';

const leaderboard = createLeaderboard({ gameId: '<gameId from .starrc>' });

game(({ ui, on }) => {
  ui.render(`
    <button id="lb-btn" class="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-bold text-white shadow-lg shadow-blue-500/20 pointer-events-auto">
      View Leaderboard
    </button>
  `);

  on('click', '#lb-btn', (e) => {
    e.stopPropagation();
    leaderboard.show();
  });
});
```

### Pattern 4: Custom Leaderboard UI

```javascript
import { createLeaderboard } from 'star-leaderboard';

const leaderboard = createLeaderboard({ gameId: '<gameId from .starrc>' });

async function showCustomLeaderboard() {
  const { scores, you, config } = await leaderboard.getScores({
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

### Pattern 5: Full Game Example

```javascript
import { createLeaderboard } from 'star-leaderboard';
import { game } from 'star-canvas';

const leaderboard = createLeaderboard({ gameId: '<gameId from .starrc>' });

game(({ ctx, width, height, loop, ui, on, canvas }) => {
  let score = 0;
  let state = 'menu';

  function startGame() {
    state = 'playing';
    score = 0;
    updateUI();
  }

  function endGame() {
    state = 'gameover';
    leaderboard.submit(score);
    updateUI();
  }

  // UI with leaderboard button
  function updateUI() {
    if (state === 'gameover') {
      ui.render(`
        <div class="h-full flex flex-col items-center justify-center text-white">
          <div class="text-3xl mb-4">GAME OVER</div>
          <div class="text-6xl mb-4">\${score}</div>
          <button id="lb-btn" class="px-6 py-3 mb-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-bold shadow-lg shadow-blue-500/20 pointer-events-auto">
            VIEW LEADERBOARD
          </button>
          <div class="text-xl animate-pulse">TAP TO RESTART</div>
        </div>
      `);
    }
  }

  on('click', '#lb-btn', (e) => {
    e.stopPropagation();
    leaderboard.show();
  });

  canvas.addEventListener('pointerdown', () => {
    if (state === 'menu' || state === 'gameover') startGame();
  });

  loop((dt) => {
    // Game logic...
  });
});
```

---

**Configuration:**

Your gameId comes from `.starrc` (created by `npx star-sdk init`). See Setup at the top.

---

**getScores Options:**

```javascript
const data = await leaderboard.getScores({
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

3. **Use `show()` to display the leaderboard** - It's the easiest way. Use `getScores()` only if you need custom rendering.

4. **Don't store leaderboard state** - Just call the SDK methods when needed. The SDK handles caching.

5. **Works for guests** - Guests get a generated name like "Guest1234". They can sign in later to claim scores.