# Click Frenzy

A 5-second click speed game with leaderboard.

## What it demonstrates

- `Star.init()` with a registered gameId
- `Star.audio.preload()` and `Star.audio.play()` for sound effects
- `Star.leaderboard.submit()` with rank feedback
- `Star.leaderboard.show()` for the leaderboard UI
- Single HTML file, no build step — imports from esm.sh

## Run it

1. Register your own game:

```bash
npx star-sdk init "Click Frenzy"
```

2. Open `.starrc` and copy your `gameId`

3. Replace the gameId in `index.html` with yours

4. Open `index.html` in a browser (or use any dev server)
