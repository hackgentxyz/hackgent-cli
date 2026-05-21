import { defineConfig } from 'tsup';

/**
 * Build a single, self-contained ESM file at `dist/cli.js` so the published
 * package has zero runtime install steps for the user beyond `npx`. The
 * shebang in `src/cli.ts` is preserved by tsup so the file is directly
 * executable on POSIX; on Windows npm/pnpm generates the .cmd shim.
 */
export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  bundle: true,
  splitting: false,
  sourcemap: false,
  clean: true,
  dts: false,
  minify: false,
  treeshake: true,
  outDir: 'dist',
  shims: true,
});
