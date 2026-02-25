#!/usr/bin/env node
/**
 * Verifies that platform-only runtime code has been eliminated from dist bundles.
 * Run after build (without STAR_PLATFORM) to catch regressions.
 */
const { readFileSync, readdirSync } = require('fs');
const { join } = require('path');

const distDir = join(__dirname, '..', 'dist');
const jsFiles = readdirSync(distDir).filter(f => /\.(mjs|cjs)$/.test(f));

// Identifiers unique to platform-only code that survive minification
const PLATFORM_MARKERS = [
  'mousedown',      // INITIATING_EVENTS regex
  'touchstart',     // INITIATING_EVENTS regex
  'WeakMap',        // listenerMap
];

let failed = false;
for (const file of jsFiles) {
  const content = readFileSync(join(distDir, file), 'utf8');
  for (const marker of PLATFORM_MARKERS) {
    if (content.includes(marker)) {
      console.error(`FAIL: ${file} contains platform-only marker: "${marker}"`);
      failed = true;
    }
  }
}

if (failed) {
  console.error('\nPlatform-only code found in npm bundles. Was STAR_PLATFORM set?');
  process.exit(1);
} else {
  console.log('OK: No platform-only code in npm bundles.');
}
