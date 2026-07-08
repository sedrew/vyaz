/**
 * render.test.ts (canvas) — Canvas rendering snapshots.
 *
 * Renders to OffscreenCanvas, saves PNG for visual review.
 * No comparison yet — just dump PNGs.
 *
 * Run: bun test packages/core/tests/canvas/render.test.ts
 */

import '../setup.ts';
import { paragraphLayoutEngine } from '../../src/layout/ParagraphLayoutEngine.js';
import { renderToCanvas } from '../../src/render/CanvasRenderer.js';
import { makeParagraph, makeMultiRunParagraph, assertCanvasSnapshot } from '../test-helpers.js';

describe('render-canvas', () => {
  it('snapshot: basic', async () => {
    const paragraph = makeParagraph('AAA BBB');
    const result = paragraphLayoutEngine.layout(paragraph, 300);

    await assertCanvasSnapshot('basic', (ctx) => {
      renderToCanvas(ctx, result.lines, { sizing: 'content' });
    });
  });

  it('snapshot: with underline', async () => {
    const paragraph = makeParagraph('Underlined text', 16);
    paragraph.children[0].underline = true;
    const result = paragraphLayoutEngine.layout(paragraph, 300);

    await assertCanvasSnapshot('underline', (ctx) => {
      renderToCanvas(ctx, result.lines, { sizing: 'content', preserveSpaces: true });
    });
  });

  it('snapshot: with strikethrough', async () => {
    const paragraph = makeParagraph('Strikethrough text', 16);
    paragraph.children[0].strikethrough = true;
    const result = paragraphLayoutEngine.layout(paragraph, 300);

    await assertCanvasSnapshot('strikethrough', (ctx) => {
      renderToCanvas(ctx, result.lines, { sizing: 'content' });
    });
  });

  it('snapshot: multi-line narrow', async () => {
    const paragraph = makeParagraph('AAA BBB CCC DDD DDDDDD');
    const result = paragraphLayoutEngine.layout(paragraph, 40);

    await assertCanvasSnapshot('multiline-narrow', (ctx) => {
      renderToCanvas(ctx, result.lines, { sizing: 'content' });
    });
  });

  it('snapshot: all-runs — different styles in one paragraph', async () => {
    const paragraph = makeMultiRunParagraph([
      { text: 'Normal ' },
      { text: 'Bold ', style: { fontWeight: 700 } },
      { text: 'Italic ', style: { fontStyle: 'italic' } },
      { text: 'Red ', style: { color: '#FF0000' } },
      { text: 'Underline ', style: { underline: true } },
      { text: 'Strikethrough', style: { strikethrough: true } },
    ]);
    const result = paragraphLayoutEngine.layout(paragraph, 600);

    await assertCanvasSnapshot('all-runs', (ctx) => {
      renderToCanvas(ctx, result.lines, { sizing: 'content', preserveSpaces: true });
    });
  });
});