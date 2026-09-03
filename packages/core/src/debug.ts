/**
 * @vyaz/core/debug — debugging & snapshot tooling.
 *
 * Kept out of the main entry so production consumers never pull `js-yaml`
 * or the invariant-checking code into their bundle.
 */

// ── Line-box invariants ───────────────────────────────────────────────
export { assertLineInvariants } from './layout/LineBoxValidator.js';
export type { InvariantError } from './layout/LineBoxValidator.js';

// ── Semantic YAML snapshots ───────────────────────────────────────────
export { linesToYAML } from './debug/lines-to-yaml.js';
export type {
  SemanticParagraph,
  SemanticLine,
  SemanticFragment,
} from './types/LayoutTypes.js';
