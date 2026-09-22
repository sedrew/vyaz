import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

/**
 * vitest.config.ts — cross-runtime Node execution of the same *.test.ts
 * files `bun test` runs.
 *
 * The test files import from `'bun:test'` (Bun's built-in test runner,
 * which doesn't exist under Node) — rather than rewriting all of them,
 * `resolve.alias` below maps that specifier to `./vitest.bun-test-shim.mts`,
 * a thin re-export of `vitest` (whose `describe`/`test`/`expect`/`beforeAll`/
 * `it` API is source-compatible) that also covers `bun:test`'s bare `spyOn`
 * export — Vitest itself only exposes that as `vi.spyOn`.
 *
 * Package-specifier imports (`@vyaz/core`, `@vyaz/renderer`) resolve via
 * each package's `package.json` "exports" map. Bun's own `"bun"` condition
 * points at live `src/`; Node has no such condition and falls through to
 * `"node"` → `dist/`. Running this under Node therefore exercises the
 * *built* package, not source — run `bun run build` first. That's a
 * feature, not a gap: `bun test` already covers source-level correctness
 * fast; this covers "does the shipped dist/ actually work" under the other
 * runtime vyaz claims to support.
 */
export default defineConfig({
  resolve: {
    alias: {
      'bun:test': resolve(import.meta.dirname, 'vitest.bun-test-shim.mts'),
    },
  },
  test: {
    include: ['packages/*/tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.skip.ts'],
    testTimeout: 20_000,
    root: resolve(import.meta.dirname),
  },
});
