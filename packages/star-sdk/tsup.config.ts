import { defineConfig } from 'tsup';

export default defineConfig([
  // Main library (npm — externals resolved by bundlers)
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    minify: true,
    external: ['star-audio', 'star-canvas', 'star-leaderboard', 'star-multiplayer'],
    outExtension({ format }) {
      return {
        js: format === 'esm' ? '.mjs' : '.cjs',
      };
    },
  },
  // Browser bundle (self-contained, no bare specifiers — served as /star-sdk/v1/star.js)
  {
    entry: { 'browser': 'src/index.ts' },
    format: ['esm'],
    clean: false,
    minify: true,
    splitting: false,
    noExternal: ['star-audio', 'star-canvas', 'star-leaderboard', 'star-multiplayer'],
    outExtension() {
      return { js: '.mjs' };
    },
  },
  // Debug module (self-contained, zero deps — served as /star-sdk/v1/debug.js)
  {
    entry: { 'debug': 'src/debug.ts' },
    format: ['esm'],
    clean: false,
    minify: true,
    splitting: false,
    outExtension() {
      return { js: '.mjs' };
    },
  },
  // CLI wrapper
  {
    entry: ['src/cli.ts'],
    format: ['esm'],
    clean: false,
    minify: false,
    external: ['star-sdk-cli'],
    outExtension() {
      return { js: '.mjs' };
    },
  },
]);
