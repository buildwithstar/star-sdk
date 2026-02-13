# Dodge

Avoid falling obstacles. Move with arrow keys / A/D or touch.

## What it demonstrates

- `Star.init()` with a registered gameId
- `Star.game()` with `ctx.loop(dt)` for delta-time movement
- `Star.audio.preload()` and `Star.audio.play()` for sound effects
- `Star.leaderboard.submit()` on game over
- `Star.leaderboard.show()` for the leaderboard UI
- Keyboard and touch input handling
- Single HTML file, no build step — imports from esm.sh

## Run it

1. Register your own game:

```bash
npx star-sdk init "Dodge"
```

2. Open `.starrc` and copy your `gameId`

3. Replace the gameId in `index.html` with yours

4. Open `index.html` in a browser (or use any dev server)
