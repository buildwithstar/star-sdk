import { defineConfig } from 'tsup';

export default defineConfig([
  // Main library
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
