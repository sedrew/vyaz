/**
 * Runtime environment detection.
 * Used to guard Node.js–only code paths (fontkit, fs, get-system-fonts)
 * from being executed in the browser.
 *
 * ⚠️ Uses `globalThis.process` instead of bare `process` to avoid
 * triggering bundler static analysis that could externalize the
 * Node.js `process` global for browser targets.
 */

const _process: any =
  typeof globalThis !== 'undefined' ? (globalThis as any).process : undefined;

/** `true` when running on Node.js or Bun (has `process.versions.node`) */
export const isNodeLike: boolean =
  _process != null &&
  _process.versions != null &&
  typeof _process.versions.node === 'string';