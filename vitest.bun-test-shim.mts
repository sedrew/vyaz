/**
 * vitest.bun-test-shim.mts — stands in for Bun's built-in `bun:test` module
 * when the same *.test.ts files run under Vitest/Node (see vitest.config.mts's
 * `resolve.alias`). `describe`/`test`/`expect`/`beforeAll`/`it` are directly
 * source-compatible between the two; `bun:test`'s bare `spyOn` export is the
 * one real API difference — Vitest only exposes it namespaced as `vi.spyOn`.
 */
import { vi } from 'vitest';

export * from 'vitest';
export const spyOn = vi.spyOn;
