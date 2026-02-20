# Star SDK

Ship browser games with leaderboards, audio, and canvas — no backend needed. One import, works everywhere including iOS Safari.

Built by LLMs, for LLMs.

[![npm](https://img.shields.io/npm/v/star-sdk)](https://www.npmjs.com/package/star-sdk)
[![npm](https://img.shields.io/npm/v/star-audio)](https://www.npmjs.com/package/star-audio)
[![npm](https://img.shields.io/npm/v/star-leaderboard)](https://www.npmjs.com/package/star-leaderboard)
[![npm](https://img.shields.io/npm/v/star-canvas)](https://www.npmjs.com/package/star-canvas)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[Website](https://buildwithstar.com) | [Docs](https://buildwithstar.com/docs/sdk) | [Examples](https://buildwithstar.com/sdk/examples/click-frenzy/)

## Why Star SDK?

| Need | Without Star | With Star |
|------|-------------|-----------|
| **Leaderboards** | Build a backend, database, auth | `Star.leaderboard.submit(score)` |
| **Mobile audio** | Handle unlock gestures, AudioContext | `Star.audio.play('coin')` |
| **HiDPI canvas** | Manual DPR scaling, coordinate math | Automatic |
| **iOS Safari** | Debug audio/touch issues for hours | It just works |
| **Hosting** | Set up hosting + backend for leaderboards | `npx star-sdk deploy` |

## Quick Start

```bash
npm install star-sdk
npx star-sdk init "My Game"    # Register your game, creates .starrc
```

**The gameId is a server-issued token from `npx star-sdk init`. Do not make one up — it will not work. Open `.starrc`, copy the gameId, and paste it below.**

```javascript
import Star from 'star-sdk';
Star.init({ gameId: '<paste gameId from .starrc>' });

Star.game(ctx => {
  let score = 0;
  Star.audio.preload({ coin: 'coin' });

  ctx.loop((dt) => {
    ctx.ctx.fillStyle = '#1a1a2e';
    ctx.ctx.fillRect(0, 0, ctx.width, ctx.height);
    ctx.ctx.fillStyle = '#fff';
    ctx.ctx.font = '24px sans-serif';
    ctx.ctx.fillText(`Score: ${score}`, 20, 40);
  });

  ctx.canvas.onclick = () => {
    score += 10;
    Star.audio.play('coin');
  };
});
```

```bash
npx star-sdk deploy
# => Live at https://buildwithstar.com/games/<id>
```

## Examples

Complete working games — single HTML files, no build step:

- **[Click Frenzy](examples/click-frenzy/)** — 5-second click speed game with leaderboard ([play live](https://buildwithstar.com/sdk/examples/click-frenzy/))
- **[Dodge](examples/dodge/)** — Avoid falling obstacles, keyboard and touch controls ([play live](https://buildwithstar.com/sdk/examples/dodge/))
- **[Reaction Time](examples/reaction-time/)** — Test your reflexes over 5 rounds ([play live](https://buildwithstar.com/sdk/examples/reaction-time/))

## Packages

| Package | Description |
|---------|-------------|
| [`star-sdk`](packages/star-sdk) | Umbrella package — single import for everything |
| [`star-audio`](packages/star-audio) | Mobile-first Web Audio with 17 built-in presets. Handles iOS Safari unlock |
| [`star-canvas`](packages/star-canvas) | Canvas game loop, DPR scaling, input handling |
| [`star-leaderboard`](packages/star-leaderboard) | Score submission and leaderboard display. No backend needed |
| [`star-sdk-cli`](packages/star-sdk-cli) | CLI: register games, deploy, install AI docs |

## For AI Agents

Star SDK is built for LLMs. Tell your agent to "build a game with star-sdk" and it works - the agent discovers the API, registers the game, wires up audio and leaderboards, and deploys. No hand-holding.

To give your agent full API docs while it codes:

```bash
npx star-sdk install          # Claude Code (default)
npx star-sdk install cursor   # Cursor
npx star-sdk install codex    # OpenAI Codex
npx star-sdk install windsurf # Windsurf
npx star-sdk install aider    # Aider
```

Reference files for agent development:

| File | Purpose |
|------|---------|
| [SKILL.md](packages/star-sdk/skills/star-sdk/SKILL.md) | Full API reference with examples |
| [AGENTS.md](AGENTS.md) | Build, test, and contribute |
| [llms.txt](llms.txt) | Machine-readable documentation index |

## Development

```bash
git clone https://github.com/buildwithstar/star-sdk.git
cd star-sdk
yarn install
yarn build    # Build all packages
```

Build and test individual packages:

```bash
yarn workspace star-audio build
yarn workspace star-audio test
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
