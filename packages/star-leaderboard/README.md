# Star Leaderboard

A simple leaderboard SDK for web games that "just works" on Star.

`star-leaderboard` handles score submission and leaderboard display with a mobile-first design. It's designed to be predictable, easy to use, and LLM-friendly.

This package is part of the **Star SDK**.

## Features

- **Bulletproof:** API failures won't crash your game - errors are logged but never thrown.
- **Tiny API Surface:** A small, guessable API (`submit`, `show`, `getScores`). No try/catch needed.
- **SSR-Safe:** Can be imported in server-side environments without errors.
- **Zero Dependencies:** Pure TypeScript, under 2KB minified.

## Install

```bash
yarn add star-leaderboard
# or
npm install star-leaderboard
```

## Setup (Required)

Register your game to get a gameId:

```bash
npx star-sdk init "My Game"
```

This creates a `.starrc` file. Open it and copy the `gameId` value. The gameId is a server-issued token — do not make one up.

## Quick Start

```javascript
import { createLeaderboard } from 'star-leaderboard';

const leaderboard = createLeaderboard({ gameId: '<gameId from .starrc>' });

// When the game ends, submit the score and show the leaderboard
function gameOver(finalScore) {
  leaderboard.submit(finalScore);
  leaderboard.show();
}
```

### With Rank Feedback

If you want to know the player's rank after submitting:

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

### Next.js / React (Client Component)

```tsx
/* app/game/page.tsx */
"use client";
import { useEffect, useMemo } from 'react';
import { createLeaderboard } from 'star-leaderboard';

export default function Game() {
  const leaderboard = useMemo(() => createLeaderboard({ gameId: '<gameId from .starrc>' }), []);

  useEffect(() => {
    return () => leaderboard.destroy();
  }, [leaderboard]);

  const handleGameOver = async (score: number) => {
    await leaderboard.submit(score);
    leaderboard.show();
  };

  return (
    <div className="h-screen w-screen">
      {/* Your game here */}
      <button onClick={() => handleGameOver(1250)}>
        End Game (Score: 1250)
      </button>
    </div>
  );
}
```

## Common Recipes

### Submit Score and Show Leaderboard

```javascript
// Fire and forget - simplest approach
leaderboard.submit(score);
leaderboard.show();

// Or wait for result
const result = await leaderboard.submit(score);
if (result.success) {
  leaderboard.show();
}
```

### Custom Leaderboard UI

```javascript
// Fetch scores for custom rendering
const data = await leaderboard.getScores({
  timeframe: 'all_time',
  limit: 100
});

// Build your own leaderboard UI
renderCustomLeaderboard(data.scores, data.config);
```

### Share Leaderboard

```javascript
// Generate a shareable link
const { shareUrl } = await leaderboard.share({
  score: 1250,
  gameTitle: 'My Awesome Game'
});

// Use Web Share API or open in new tab
if (navigator.share) {
  navigator.share({ url: shareUrl });
} else {
  window.open(shareUrl, '_blank');
}
```

### Listen for Submit Events

```javascript
const unsubscribe = leaderboard.onSubmit((result) => {
  if (result.success) {
    showConfetti();
  }
});

// Later, clean up
unsubscribe();
```

## API Reference

### `createLeaderboard(options)`

Creates a leaderboard instance.

**Options:**
- `gameId: string` — Your game ID (from `.starrc`, created by `npx star-sdk init`)
- `apiBase?: string` — API base URL override (rarely needed)

**Returns:** `StarLeaderboard` instance

### `StarLeaderboard`

| Method | Description |
|--------|-------------|
| `submit(score)` | Submit a score. Returns `Promise<SubmitResult>` |
| `show()` | Show the leaderboard UI |
| `getScores(options?)` | Fetch leaderboard data. Returns `Promise<LeaderboardData>` |
| `share(options?)` | Generate a shareable link. Returns `Promise<ShareResult>` |
| `onSubmit(fn)` | Subscribe to submit events. Returns unsubscribe function |
| `destroy()` | Clean up resources |

**Aliases:**
- `submitScore` → alias for `submit`
- `showLeaderboard` → alias for `show`

### Types

```typescript
interface SubmitResult {
  success: boolean;
  rank?: number;
  scoreId?: string;
  error?: string;
}

interface LeaderboardData {
  scores: ScoreEntry[];
  config?: LeaderboardConfig;
  timeframe: 'weekly' | 'all_time';
  you?: ScoreEntry | null;
  weekResetTime?: number | null;
}

interface ScoreEntry {
  id: string;
  playerName: string | null;
  score: number;
  rank: number;
  submittedAt: string;
}
```

## Error Handling Philosophy

Star Leaderboard is designed to **never crash your game**. All methods gracefully handle failures:

```javascript
// ✅ This never throws - even if the API is down!
const result = await leaderboard.submit(score);

if (!result.success) {
  // ⚠️ Logged to console, error in result
  console.log('Submission failed:', result.error);
}

// Game continues working
leaderboard.show(); // ✅ Still works (shows cached/empty state)
```

**No try/catch needed.** Failed API calls are logged to the console with clear warnings, but your game keeps running.

## Known Limitations

- **No offline support:** Scores require network connectivity to submit.
- **Weekly reset:** Weekly leaderboards reset Monday 02:00 UTC (Sunday 9pm ET).

## License

MIT
