/**
 * render-debug-svg.test.ts — SVG debug overlay snapshots.
 *
 * Uses ONE big paragraph with mixed runs (bold, italic, color, underline,
 * strikethrough, mixed font sizes) and renders it with different debug
 * flag combinations to visually verify the box model.
 *
 * Canvas is rendered at fixed size (not content) so that frame/debug
 * overlays are fully visible.
 *
 * Run: bun test packages/core/tests/render-debug-svg.test.ts
 */

import './setup.ts';
import { paragraphLayoutEngine } from '../src/layout/ParagraphLayoutEngine.js';
import { renderToSVG } from '../src/render/SVGRenderer.js';
import { renderToCanvas } from '../src/render/CanvasRenderer.js';
import { makeMultiRunParagraph, assertSvgSnapshot, enableCanvasSnapshots } from './test-helpers.js';
import isSvg from 'is-svg';
import type { SvgPreset } from '../src/render/SVGRenderer.js';
import type { DebugFlags } from '../src/types/RenderTypes.js';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';

// ── One big paragraph with mixed styles ────────────────────────────────

const BIG_PARAGRAPH = makeMultiRunParagraph([
  { text: 'Hello ' },
  { text: 'BIG ', style: { fontSize: 32, fontWeight: 700 } },
  { text: 'normal ' },
  { text: 'italic ', style: { fontStyle: 'italic', fontSize: 20 } },
  { text: 'Red ', style: { color: '#FF0000', fontSize: 16 } },
  { text: 'Under ', style: { underline: true, fontSize: 18 } },
  { text: 'Strike ', style: { strikethrough: true, fontSize: 14 } },
  { text: 'Small ', style: { fontSize: 10 } },
  { text: 'and ' },
  { text: 'EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE', style: { fontSize: 16 } }, // long word → wrap
  { text: ' finish.' },
]);

const SVG_PRESET: SvgPreset = 'preserve';
const MAX_WIDTH = 400;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PNG_DIR = resolve(__dirname, 'snapshots', 'png');

/** Layout the big paragraph and return result + lines */
function layoutBig(): { result: any; svg: string; lines: any[] } {
  const result = paragraphLayoutEngine.layout(BIG_PARAGRAPH, MAX_WIDTH);
  const svg = renderToSVG(result.lines, {
    preset: SVG_PRESET,
    sizing: 'content',
  });
  expect(isSvg(svg)).toBe(true);
  return { result, svg, lines: result.lines };
}

/**
 * Snapshot helper: saves SVG always, saves canvas PNG when fixture is on.
 * Canvas uses fixed size (not content) so debug overlays are fully visible.
 */
async function assertDebugRender(
  name: string,
  svg: string,
  lines: any[],
  canvasDebug: DebugFlags,
  canvasWidth: number = 600,
  canvasHeight: number = 200,
): Promise<void> {
  assertSvgSnapshot(name, svg);

  const canvas = new OffscreenCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  renderToCanvas(ctx, lines, {
    sizing: 'frame',
    preserveSpaces: true,
    backgroundColor: '#ffffff',
    debug: canvasDebug,
  });

  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const buffer = await blob.arrayBuffer();
  mkdirSync(PNG_DIR, { recursive: true });
  writeFileSync(resolve(PNG_DIR, `canvas-${name}.png`), Buffer.from(buffer));
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('render-debug-svg', () => {
  enableCanvasSnapshots();

  it('big-lines — line boxes + baselines + labels', async () => {
    const { lines } = layoutBig();
    const debugSvg = renderToSVG(lines, {
      preset: SVG_PRESET,
      sizing: 'content',
      debug: { box: true, baseline: true, labels: true },
    });
    expect(isSvg(debugSvg)).toBe(true);
    await assertDebugRender('svg-debug-big-lines', debugSvg, lines,
      { frame: true, box: true, baseline: true, labels: true },
      600, 200,
    );
  });

  it('big-runs — purple fragment boxes + labels', async () => {
    const { lines } = layoutBig();
    const debugSvg = renderToSVG(lines, {
      preset: SVG_PRESET,
      sizing: 'content',
      debug: { runs: true, labels: true },
    });
    expect(isSvg(debugSvg)).toBe(true);
    await assertDebugRender('svg-debug-big-runs', debugSvg, lines,
      { frame: true, runs: true, labels: true },
      600, 200,
    );
  });

  it('big-metrics — baseline + ascent/descent + labels', async () => {
    const { lines } = layoutBig();
    const debugSvg = renderToSVG(lines, {
      preset: SVG_PRESET,
      sizing: 'content',
      debug: { baseline: true, ascentDescent: true, labels: true },
    });
    expect(isSvg(debugSvg)).toBe(true);
    await assertDebugRender('svg-debug-big-metrics', debugSvg, lines,
      { frame: true, baseline: true, ascentDescent: true, labels: true },
      600, 200,
    );
  });

  it('big-frame — yellow frame around content', async () => {
    const { lines } = layoutBig();
    const debugSvg = renderToSVG(lines, {
      preset: SVG_PRESET,
      sizing: 'content',
      debug: { frame: true },
    });
    expect(isSvg(debugSvg)).toBe(true);
    await assertDebugRender('svg-debug-big-frame', debugSvg, lines,
      { frame: true },
      600, 200,
    );
  });

  it('big-linegap — line height filled rects + box + labels', async () => {
    const { lines } = layoutBig();
    const debugSvg = renderToSVG(lines, {
      preset: SVG_PRESET,
      sizing: 'content',
      debug: { lineGap: true, box: true, labels: true },
    });
    expect(isSvg(debugSvg)).toBe(true);
    await assertDebugRender('svg-debug-big-linegap', debugSvg, lines,
      { frame: true, lineGap: true, box: true, labels: true },
      600, 200,
    );
  });

  it('big-all — all debug flags combined', async () => {
    const { lines } = layoutBig();
    const allDebug: DebugFlags = {
      frame: true,
      box: true,
      baseline: true,
      ascentDescent: true,
      runs: true,
      labels: true,
      lineGap: true,
    };
    const debugSvg = renderToSVG(lines, {
      preset: SVG_PRESET,
      sizing: 'content',
      debug: allDebug,
    });
    expect(isSvg(debugSvg)).toBe(true);
    await assertDebugRender('svg-debug-big-all', debugSvg, lines,
      allDebug,
      600, 200,
    );
  });
});