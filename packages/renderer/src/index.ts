/**
 * @vyaz/renderer — SVG and Canvas renderers.
 *
 * Converts Line[] (from @vyaz/core) into SVG strings or Canvas drawings.
 */

export { renderToSVG, renderParagraphToSVG, renderResultToSVG } from './SVGRenderer.js';
export type { SVGRenderOptions, SvgPreset, SvgStyle, SvgFit, SvgSizing } from './SVGRenderer.js';

export { renderToCanvas, renderDebugToCanvas } from './CanvasRenderer.js';
export type { CanvasRenderOptions } from './CanvasRenderer.js';

export type { DebugFlags } from './types.js';