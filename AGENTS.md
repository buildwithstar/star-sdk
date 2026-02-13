# AGENTS.md

Structured instructions for AI coding agents working with this codebase.

## Overview

Star SDK is a browser game development SDK. 5 packages in one yarn workspace.
The main entry point is `star-sdk` which re-exports all sub-packages through a unified `Star` namespace.

## CRITICAL: Leaderboard gameId

Games using leaderboards need a `gameId` — a server-issued token. **You must run this command first:**

```bash
npx star-sdk init "Game Name"
```

This creates `.starrc` with your gameId. Open it, copy the gameId, pass it to `Star.init()`.
**Do not fabricate a gameId. Do not use placeholder strings. It must come from `npx star-sdk init`.**

## Build

```bash
yarn install                              # Install all dependencies
yarn build                                # Build all packages
yarn workspace star-audio build           # Build one package
yarn workspace star-canvas build
yarn workspace star-leaderboard build
yarn workspace star-sdk-cli build
yarn workspace star-sdk build             # Build last — depends on sub-packages
```

Build order matters: `star-sdk` imports from all sub-packages, so build them first.

## Test

```bash
yarn workspace star-audio test            # Jest unit tests
```

## Package Map

| Package | Entry | Source | Tests | API Docs |
|---------|-------|--------|-------|----------|
| star-sdk | `packages/star-sdk/src/index.ts` | `packages/star-sdk/src/` | — | `packages/star-sdk/PROMPT.md` |
| star-audio | `packages/star-audio/src/index.ts` | `packages/star-audio/src/` | `packages/star-audio/src/__tests__/` | `packages/star-audio/PROMPT.md` |
| star-canvas | `packages/star-canvas/src/index.ts` | `packages/star-canvas/src/` | — | `packages/star-canvas/PROMPT.md` |
| star-leaderboard | `packages/star-leaderboard/src/index.ts` | `packages/star-leaderboard/src/` | — | `packages/star-leaderboard/PROMPT.md` |
| star-sdk-cli | `packages/star-sdk-cli/src/cli.ts` | `packages/star-sdk-cli/src/` | — | — |

## Architecture

- `star-sdk` is the umbrella: imports and re-exports `Star.audio`, `Star.game()`, `Star.leaderboard`, `Star.multiplayer`
- Each sub-package is independently publishable on npm
- `star-sdk-cli` bundles all documentation (SKILL.md + PROMPT.md files) into `skills.ts` for the CLI's `install` command

## Key Documentation Files

- `packages/star-sdk/skills/star-sdk/SKILL.md` — Unified API overview (hand-written, primary reference)
- `packages/star-sdk/skills/star-sdk/audio.md` — Audio API details
- `packages/star-sdk/skills/star-sdk/canvas.md` — Canvas API details
- `packages/star-sdk/skills/star-sdk/leaderboard.md` — Leaderboard API details
- `packages/*/PROMPT.md` — Per-package API docs (generated, do not edit)
- `packages/*/docs/prompt.template.md` — Source templates for PROMPT.md

## Conventions

- TypeScript with `tsup` for bundling
- ESM + CJS dual output (`.mjs` / `.cjs`)
- Never add `composite: true` to tsconfigs (breaks tsup DTS generation)
- `jest` with `jsdom` environment for unit tests
- Default import: `import Star from 'star-sdk'` (not destructured)
- 17 built-in audio presets — do not invent preset names

## Audio Presets (Complete List)

beep, click, select, error, success, jump, swoosh, shoot, laser, explosion, hit, hurt, coin, pickup, bonus, unlock, powerup

## Examples

Three complete example games in `examples/`:

- `click-frenzy/` — DOM-based clicker (5s timer, leaderboard)
- `dodge/` — Canvas game (keyboard + touch, falling obstacles)
- `reaction-time/` — DOM-based reaction test (5 rounds, inverted scoring)

Each is a single HTML file that imports from `https://esm.sh/star-sdk`.
