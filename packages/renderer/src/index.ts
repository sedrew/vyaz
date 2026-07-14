/**
 * @vyaz/renderer — SVG and Canvas renderers.
 *
 * Converts Line[] (from @vyaz/core) into SVG strings or Canvas drawings.
 */

export { renderToSVG, renderParagraphToSVG, renderResultToSVG } from './SVGRenderer.js';
export type { SVGRenderOptions, SvgPreset, SvgStyle, SvgFit, SvgSizing } from './SVGRenderer.js';

export { renderToCanvas, renderDebugToCanvas, renderSelection, renderCursor } from './CanvasRenderer.js';
export type { CanvasRenderOptions, CursorOptions } from './CanvasRenderer.js';

export { charAtPoint, charIndexToPos, posToCharIndex } from './interactive.js';
export type { CharPos } from './interactive.js';

export type { DebugFlags } from './types.js';
