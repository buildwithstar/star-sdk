# Reaction Time

Test your reflexes over 5 rounds. Wait for the screen to turn green, then tap as fast as you can.

## What it demonstrates

- `Star.init()` with a registered gameId
- `Star.audio.preload()` and `Star.audio.play()` for sound effects
- `Star.leaderboard.submit()` with score inversion (lower reaction time = higher score)
- `Star.leaderboard.show()` for the leaderboard UI
- DOM-based game (no canvas) — Star SDK works for both canvas and DOM games
- Single HTML file, no build step — imports from esm.sh

## Run it

1. Register your own game:

```bash
npx star-sdk init "Reaction Time"
```

2. Open `.starrc` and copy your `gameId`

3. Replace the gameId in `index.html` with yours

4. Open `index.html` in a browser (or use any dev server)
