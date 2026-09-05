/**
 * @vyaz/converters — browser entry.
 *
 * Identical surface to `index.ts`; the converter is DOM-only and has no
 * node:*-specific paths, so this just re-exports.
 */
export { htmlToTextFrame } from './index.js';
export type {
  HtmlConvertResult,
  HtmlConvertOptions,
  UnsupportedPolicy,
  ResolvedImage,
  HtmlWarning,
  DroppedNode,
} from './index.js';
