import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    legacy: 'src/legacy.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  minify: true,
  sourcemap: false,
  splitting: false,  // Keep each file self-contained for direct browser use
  noExternal: ['morphdom'],  // Bundle morphdom inline (no bare specifiers in browser)
  define: {
    '__PLATFORM__': process.env.STAR_PLATFORM === 'true' ? 'true' : 'false',
  },
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.cjs',
    };
  },
});
