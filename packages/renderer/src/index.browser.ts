/**
 * @vyaz/renderer — Browser entry point.
 *
 * Re-exports everything from the main index.
 * In browser environments @vyaz/core resolves to its browser entry
 * (dist/index.browser.js) via package.json exports.
 *
 * ✅ Safe for Vite / webpack / Rollup / esbuild browser builds.
 */

export { renderToSVG, renderParagraphToSVG, renderResultToSVG } from './SVGRenderer.js';
export type { SVGRenderOptions, SvgPreset, SvgStyle, SvgFit, SvgSizing } from './SVGRenderer.js';

export { renderToCanvas, renderDebugToCanvas, renderSelection, renderCursor } from './CanvasRenderer.js';
export type { CanvasRenderOptions, CursorOptions } from './CanvasRenderer.js';

export { charAtPoint, charIndexToPos, posToCharIndex } from './interactive.js';
export type { CharPos } from './interactive.js';

export type { DebugFlags } from './types.js';