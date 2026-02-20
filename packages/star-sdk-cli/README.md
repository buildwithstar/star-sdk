# star-sdk-cli

CLI for [Star SDK](https://www.npmjs.com/package/star-sdk) — register games, deploy to hosting, and install AI coding docs.

## Usage

All commands run via `npx star-sdk` (no global install needed).

### Commands

| Command | Description |
|---------|-------------|
| `npx star-sdk init "Game Name"` | Register a game, get a gameId and deploy key |
| `npx star-sdk deploy [path]` | Deploy your game to Star hosting |
| `npx star-sdk install [agent]` | Install SDK docs for AI coding tools |
| `npx star-sdk docs [topic]` | Print API docs (audio, canvas, leaderboard) |
| `npx star-sdk whoami` | Show current game config |

### Workflow

```bash
# 1. Register your game
npx star-sdk init "My Game"
# Creates .starrc with gameId and deploy key

# 2. Build your game (use the gameId from .starrc)
# ... write your game code ...

# 3. Deploy
npx star-sdk deploy
# => Live at https://buildwithstar.com/games/<id>
```

### AI Agent Support

Install SDK documentation directly into your AI coding tool:

```bash
npx star-sdk install          # Claude Code (default)
npx star-sdk install cursor   # Cursor
npx star-sdk install codex    # OpenAI Codex
npx star-sdk install windsurf # Windsurf
npx star-sdk install aider    # Aider
```

## Documentation

Full docs at [buildwithstar.com/docs/sdk](https://buildwithstar.com/docs/sdk)

## License

MIT
