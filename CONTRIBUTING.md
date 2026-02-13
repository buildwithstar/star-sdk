# Contributing to Star SDK

Thanks for your interest in contributing!

## Getting Started

1. Fork the repo
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/star-sdk.git`
3. Install dependencies: `yarn install`
4. Create a branch: `git checkout -b my-change`

## Making Changes

### Build and test before submitting

```bash
yarn workspace star-audio build && yarn workspace star-audio test
yarn workspace star-canvas build
yarn workspace star-leaderboard build
yarn workspace star-sdk-cli build
yarn workspace star-sdk build
```

### Code style

- Follow existing patterns in the codebase
- TypeScript with tsup for building
- ESM + CJS dual output

### Documentation

- **SKILL.md** (`packages/star-sdk/skills/star-sdk/SKILL.md`) — hand-written, edit directly
- **PROMPT.md** files — generated, do not edit directly
- **prompt.template.md** files (`packages/*/docs/prompt.template.md`) — source templates for PROMPT.md
- For small doc changes, editing PROMPT.md directly is fine; maintainers will sync templates

### Adding examples

Examples live in `examples/` at the repo root. Each example is a single HTML file that:
- Imports from `https://esm.sh/star-sdk`
- Uses only the 17 built-in audio presets
- Includes a `README.md` with a brief description
- Works on mobile (touch controls) and desktop

## Pull Requests

- One logical change per PR
- Descriptive title and summary
- Link relevant issues

## Publishing

Publishing to npm is done by maintainers. PRs to this repo will be reviewed, merged, and synced upstream.

## Questions?

Open an issue or start a discussion.
