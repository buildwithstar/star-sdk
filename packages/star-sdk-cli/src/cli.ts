/**
 * Star SDK CLI
 *
 * Commands:
 *   init <name>        Register a new game
 *   install [agent]    Install Star SDK docs for AI coding agents
 *   docs [topic]       Print API documentation
 *   whoami             Show current configuration
 *
 * Supported agents:
 *   claude (default)   Claude Code (~/.claude/skills/)
 *   codex              OpenAI Codex (AGENTS.md)
 *   cursor             Cursor (.cursor/rules/)
 *   windsurf           Windsurf (.windsurf/rules/)
 *   aider              Aider (CONVENTIONS.md)
 *
 * Options:
 *   --email <email>   Optional email for higher rate limits
 *   --project         Install to project instead of global
 *   --help            Show help
 *   --version         Show version
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Bundled skill content (generated at build time)
import { SKILL_CONTENT, AUDIO_DOCS, CANVAS_DOCS, LEADERBOARD_DOCS } from './skills';

const VERSION = '0.1.0';
const API_BASE = process.env.STAR_API_BASE || 'https://buildwithstar.com';
const CONFIG_FILE = '.starrc';

interface StarConfig {
  gameId: string;
  name: string;
  email?: string;
  dashboardUrl?: string;
}

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(message: string) {
  console.log(message);
}

function success(message: string) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function error(message: string) {
  console.error(`${colors.red}✗${colors.reset} ${message}`);
}

function info(message: string) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

function showHelp() {
  log(`
${colors.bright}Star SDK CLI${colors.reset} v${VERSION}

${colors.dim}Commands:${colors.reset}
  ${colors.cyan}init <name>${colors.reset}        Register a new game
  ${colors.cyan}install [agent]${colors.reset}    Install Star SDK docs for AI coding agents
  ${colors.cyan}docs [topic]${colors.reset}       Print API documentation (default: all docs)
  ${colors.cyan}whoami${colors.reset}             Show current configuration

${colors.dim}Supported agents:${colors.reset}
  ${colors.cyan}claude${colors.reset}   ${colors.dim}(default)${colors.reset}  Claude Code   → ~/.claude/skills/star-sdk/
  ${colors.cyan}codex${colors.reset}              OpenAI Codex  → ./AGENTS.md
  ${colors.cyan}cursor${colors.reset}             Cursor        → .cursor/rules/star-sdk.mdc
  ${colors.cyan}windsurf${colors.reset}           Windsurf      → .windsurf/rules/star-sdk.md
  ${colors.cyan}aider${colors.reset}              Aider         → ./CONVENTIONS.md

${colors.dim}Options:${colors.reset}
  --email <email>   Email for higher rate limits (optional)
  --global          Install to global location (codex: ~/.codex/)
  --project         Install to project directory
  --help            Show this help message
  --version         Show version

${colors.dim}Examples:${colors.reset}
  ${colors.dim}# Register a new game${colors.reset}
  npx star-sdk init "My Awesome Game"

  ${colors.dim}# Install for different AI agents${colors.reset}
  npx star-sdk install           ${colors.dim}# Claude Code (default)${colors.reset}
  npx star-sdk install codex     ${colors.dim}# OpenAI Codex${colors.reset}
  npx star-sdk install cursor    ${colors.dim}# Cursor${colors.reset}
  npx star-sdk install windsurf  ${colors.dim}# Windsurf${colors.reset}
  npx star-sdk install aider     ${colors.dim}# Aider${colors.reset}

  ${colors.dim}# Print API docs (works with any LLM)${colors.reset}
  npx star-sdk docs              ${colors.dim}# All docs${colors.reset}
  npx star-sdk docs audio        ${colors.dim}# Just audio API${colors.reset}
  npx star-sdk docs skill        ${colors.dim}# Just main skill file${colors.reset}

${colors.dim}Learn more:${colors.reset} https://buildwithstar.com/docs
`);
}

function showVersion() {
  log(`star-sdk-cli v${VERSION}`);
}

function loadConfig(): StarConfig | null {
  const configPath = path.join(process.cwd(), CONFIG_FILE);
  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function saveConfig(config: StarConfig) {
  const configPath = path.join(process.cwd(), CONFIG_FILE);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

async function initCommand(name: string, email?: string) {
  if (!name || name.trim().length === 0) {
    error('Game name is required');
    log('\nUsage: npx star-sdk init "Game Name"');
    process.exit(1);
  }

  // Check for existing config
  const existing = loadConfig();
  if (existing) {
    info(`Found existing config for "${existing.name}" (${existing.gameId})`);
    log('');
  }

  log(`Registering game: ${colors.bright}${name}${colors.reset}`);

  try {
    const response = await fetch(`${API_BASE}/api/sdk/games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: name.trim(),
        email: email?.trim() || undefined,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      if (response.status === 429) {
        error('Rate limit exceeded. Maximum 10 games per hour.');
        log('Try again later or provide an email for higher limits.');
        process.exit(1);
      }
      error(data.error || `Failed to register game (HTTP ${response.status})`);
      process.exit(1);
    }

    const data = await response.json();

    // Save config
    const config: StarConfig = {
      gameId: data.gameId,
      name: data.name,
      email: email?.trim(),
      dashboardUrl: data.dashboardUrl,
    };
    saveConfig(config);

    log('');
    success(`Game registered successfully!`);
    log('');
    log(`  ${colors.dim}Game ID:${colors.reset}    ${colors.cyan}${data.gameId}${colors.reset}`);
    log(`  ${colors.dim}Dashboard:${colors.reset}  ${colors.cyan}${data.dashboardUrl}${colors.reset}`);
    log('');
    log(`${colors.dim}Config saved to${colors.reset} ${colors.bright}.starrc${colors.reset}`);
    log('');
    log(`${colors.dim}Next steps:${colors.reset}`);
    log(`  1. Install the leaderboard package: ${colors.cyan}yarn add star-leaderboard${colors.reset}`);
    log(`  2. Submit scores and show the leaderboard`);
    log('');
    log(`${colors.dim}Example:${colors.reset}`);
    log(`  ${colors.cyan}import { createLeaderboard } from 'star-leaderboard';${colors.reset}`);
    log(`  ${colors.cyan}const leaderboard = createLeaderboard({ gameId: '${data.gameId}' });${colors.reset}`);
    log(`  ${colors.cyan}leaderboard.submit(1500);${colors.reset}`);
    log(`  ${colors.cyan}leaderboard.show();${colors.reset}`);
    log('');
    log(`${colors.dim}Using an AI coding agent?${colors.reset}`);
    log(`  ${colors.cyan}npx star-sdk install${colors.reset}        ${colors.dim}Claude Code, Codex, Cursor, Windsurf, Aider${colors.reset}`);
    log('');
    log(`${colors.dim}Documentation:${colors.reset}`);
    log(`  ${colors.cyan}https://buildwithstar.com/docs${colors.reset}`);
    log('');
  } catch (err: any) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      error('Could not connect to Star API. Check your internet connection.');
    } else {
      error(err.message || 'Failed to register game');
    }
    process.exit(1);
  }
}

function whoamiCommand() {
  const config = loadConfig();

  if (!config) {
    info('No .starrc found in current directory');
    log('');
    log('Run "npx star-sdk init <name>" to register a game.');
    return;
  }

  log('');
  log(`${colors.bright}Current Configuration${colors.reset}`);
  log('');
  log(`  ${colors.dim}Game:${colors.reset}       ${config.name}`);
  log(`  ${colors.dim}Game ID:${colors.reset}    ${colors.cyan}${config.gameId}${colors.reset}`);
  if (config.email) {
    log(`  ${colors.dim}Email:${colors.reset}      ${config.email}`);
  }
  if (config.dashboardUrl) {
    log(`  ${colors.dim}Dashboard:${colors.reset}  ${colors.cyan}${config.dashboardUrl}${colors.reset}`);
  }
  log('');
}

type Agent = 'claude' | 'codex' | 'cursor' | 'windsurf' | 'aider';

/**
 * Transform SKILL.md content for terminal output.
 * Replaces file references (which work in Claude Code) with CLI command hints.
 */
function transformForStdout(content: string): string {
  return content
    // Transform markdown links: [file.md](./file.md) → topic (`npx star-sdk docs topic`)
    .replace(/\[(\w+)\.md\]\(\.\/\1\.md\)/g, '$1 (`npx star-sdk docs $1`)')
    // Transform "see file.md" references
    .replace(/see (\w+)\.md/g, 'run `npx star-sdk docs $1`')
    // Transform final documentation reference line
    .replace(
      /For detailed API documentation, see the linked files above\./,
      'For detailed API docs: `npx star-sdk docs <topic>` where topic is audio, canvas, or leaderboard.'
    );
}

function getAllDocsContent(): string {
  return `${SKILL_CONTENT}

---

# Audio API

${AUDIO_DOCS}

---

# Canvas API

${CANVAS_DOCS}

---

# Leaderboard API

${LEADERBOARD_DOCS}`;
}

function installClaudeCode(scope: 'global' | 'project') {
  const skillDir = scope === 'global'
    ? path.join(os.homedir(), '.claude', 'skills', 'star-sdk')
    : path.join(process.cwd(), '.claude', 'skills', 'star-sdk');

  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), SKILL_CONTENT);
  fs.writeFileSync(path.join(skillDir, 'audio.md'), AUDIO_DOCS);
  fs.writeFileSync(path.join(skillDir, 'canvas.md'), CANVAS_DOCS);
  fs.writeFileSync(path.join(skillDir, 'leaderboard.md'), LEADERBOARD_DOCS);

  log('');
  success(`Star SDK skill installed to ${skillDir}`);
  log('');
  log(`${colors.dim}Claude Code will now auto-discover the Star SDK when you work on games.${colors.reset}`);
  log('');
  log(`${colors.dim}Installed files:${colors.reset}`);
  log(`  SKILL.md        ${colors.dim}Main skill entry point${colors.reset}`);
  log(`  audio.md        ${colors.dim}Star.audio API docs${colors.reset}`);
  log(`  canvas.md       ${colors.dim}Star.game() API docs${colors.reset}`);
  log(`  leaderboard.md  ${colors.dim}Star.leaderboard API docs${colors.reset}`);
  log('');
}

function installCodex(scope: 'global' | 'project') {
  const content = `# Star SDK - Browser Game Development

${getAllDocsContent()}`;

  const filePath = scope === 'global'
    ? path.join(os.homedir(), '.codex', 'AGENTS.md')
    : path.join(process.cwd(), 'AGENTS.md');

  if (scope === 'global') {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }

  // Check for existing file
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, 'utf-8');
    if (existing.includes('Star SDK')) {
      info(`Star SDK already present in ${filePath}`);
      return;
    }
    // Append to existing
    fs.writeFileSync(filePath, existing + '\n\n' + content);
    success(`Star SDK appended to ${filePath}`);
  } else {
    fs.writeFileSync(filePath, content);
    success(`Star SDK installed to ${filePath}`);
  }

  log('');
  log(`${colors.dim}Codex will now have access to Star SDK documentation.${colors.reset}`);
  log('');
}

function installCursor() {
  const rulesDir = path.join(process.cwd(), '.cursor', 'rules');
  const filePath = path.join(rulesDir, 'star-sdk.mdc');

  const content = `---
description: Star SDK for browser game development with audio, canvas, and leaderboards
globs: ["**/*.js", "**/*.ts", "**/*.jsx", "**/*.tsx", "**/*.html"]
alwaysApply: false
---

${getAllDocsContent()}`;

  fs.mkdirSync(rulesDir, { recursive: true });
  fs.writeFileSync(filePath, content);

  log('');
  success(`Star SDK installed to ${filePath}`);
  log('');
  log(`${colors.dim}Cursor will now have access to Star SDK documentation.${colors.reset}`);
  log(`${colors.dim}Use @star-sdk to reference it in Cursor chat.${colors.reset}`);
  log('');
}

function installWindsurf() {
  const rulesDir = path.join(process.cwd(), '.windsurf', 'rules');
  const filePath = path.join(rulesDir, 'star-sdk.md');

  const content = `# Star SDK - Browser Game Development

${getAllDocsContent()}`;

  fs.mkdirSync(rulesDir, { recursive: true });
  fs.writeFileSync(filePath, content);

  log('');
  success(`Star SDK installed to ${filePath}`);
  log('');
  log(`${colors.dim}Windsurf will now have access to Star SDK documentation.${colors.reset}`);
  log('');
}

function installAider() {
  const filePath = path.join(process.cwd(), 'CONVENTIONS.md');

  const content = `# Star SDK - Browser Game Development

${getAllDocsContent()}`;

  // Check for existing file
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, 'utf-8');
    if (existing.includes('Star SDK')) {
      info(`Star SDK already present in ${filePath}`);
      return;
    }
    // Append to existing
    fs.writeFileSync(filePath, existing + '\n\n' + content);
    success(`Star SDK appended to ${filePath}`);
  } else {
    fs.writeFileSync(filePath, content);
    success(`Star SDK installed to ${filePath}`);
  }

  log('');
  log(`${colors.dim}Add to aider with: aider --read CONVENTIONS.md${colors.reset}`);
  log('');
}

function installCommand(agent: Agent = 'claude', scope: 'global' | 'project' = 'global') {
  try {
    switch (agent) {
      case 'claude':
        installClaudeCode(scope);
        break;
      case 'codex':
        installCodex(scope);
        break;
      case 'cursor':
        installCursor();
        break;
      case 'windsurf':
        installWindsurf();
        break;
      case 'aider':
        installAider();
        break;
      default:
        error(`Unknown agent: ${agent}`);
        log('');
        log('Supported agents: claude, codex, cursor, windsurf, aider');
        process.exit(1);
    }
  } catch (err: any) {
    error(`Failed to install: ${err.message}`);
    process.exit(1);
  }
}

function docsCommand(topic?: string) {
  const docs: Record<string, string> = {
    skill: SKILL_CONTENT,
    audio: AUDIO_DOCS,
    canvas: CANVAS_DOCS,
    leaderboard: LEADERBOARD_DOCS,
  };

  if (!topic) {
    // Print skill content with transformed references for CLI
    console.log(transformForStdout(SKILL_CONTENT));
  } else if (docs[topic]) {
    console.log(docs[topic]);
  } else {
    error(`Unknown topic: ${topic}`);
    log('');
    log('Available topics: skill, audio, canvas, leaderboard');
    process.exit(1);
  }
}

// Parse arguments
function parseArgs(args: string[]): { command: string; positional: string[]; flags: Record<string, string | boolean> } {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  let command = '';

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const nextArg = args[i + 1];

      if (nextArg && !nextArg.startsWith('--')) {
        flags[key] = nextArg;
        i++;
      } else {
        flags[key] = true;
      }
    } else if (!command) {
      command = arg;
    } else {
      positional.push(arg);
    }
  }

  return { command, positional, flags };
}

async function main() {
  const args = process.argv.slice(2);
  const { command, positional, flags } = parseArgs(args);

  // Handle flags
  if (flags.help || flags.h) {
    showHelp();
    return;
  }

  if (flags.version || flags.v) {
    showVersion();
    return;
  }

  // Get email from flag or environment
  const email = (flags.email as string) || process.env.STAR_EMAIL;

  // Handle commands
  switch (command) {
    case 'init':
      await initCommand(positional[0], email);
      break;

    case 'install': {
      const agent = (positional[0] || 'claude') as Agent;
      const scope = flags.project ? 'project' : 'global';
      installCommand(agent, scope);
      break;
    }

    case 'docs':
    case 'skill':
    case 'prompt':
      docsCommand(positional[0]);
      break;

    case 'whoami':
      whoamiCommand();
      break;

    case '':
      showHelp();
      break;

    default:
      error(`Unknown command: ${command}`);
      log('');
      log('Run "npx star-sdk --help" for available commands.');
      process.exit(1);
  }
}

main().catch((err) => {
  error(err.message || 'An unexpected error occurred');
  process.exit(1);
});
