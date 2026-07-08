/**
 * render-svg.test.ts — SVG rendering snapshots.
 *
 * For each preset, generates SVG, validates it with is-svg,
 * and compares against a stored .svg file.
 *
 * Run: bun test packages/core/tests/render-svg.test.ts
 */

import './setup.ts';
import { paragraphLayoutEngine } from '../src/layout/ParagraphLayoutEngine.js';
import { renderToSVG } from '../src/render/SVGRenderer.js';
import { makeParagraph, makeMultiRunParagraph, assertSvgSnapshot, assertRender, enableCanvasSnapshots } from './test-helpers.js';
import isSvg from 'is-svg';
import type { SvgPreset } from '../src/render/SVGRenderer.js';

const ALL_PRESETS: SvgPreset[] = [
  'flat',
  'browser',
  'preserve',
];

describe('render-svg', () => {
  enableCanvasSnapshots();

  for (const preset of ALL_PRESETS) {
    it(`snapshot: ${preset}`, async () => {
      const paragraph = makeParagraph('AAA BBB');
      const result = paragraphLayoutEngine.layout(paragraph, 300);

      const svg = renderToSVG(result.lines, {
        preset,
        sizing: 'content',
      });

      expect(isSvg(svg)).toBe(true);
      await assertRender(`svg-${preset}`, svg, result.lines);
    });
  }

  it('preserve with xml style', async () => {
    const paragraph = makeParagraph('AAA BBB');
    const result = paragraphLayoutEngine.layout(paragraph, 300);

    const svg = renderToSVG(result.lines, {
      preset: 'preserve',
      style: 'xml',
      sizing: 'content',
    });

    expect(isSvg(svg)).toBe(true);
    await assertRender('svg-preserve-xml', svg, result.lines);
  });

  it('preserve with css style', async () => {
    const paragraph = makeParagraph('AAA BBB');
    const result = paragraphLayoutEngine.layout(paragraph, 300);

    const svg = renderToSVG(result.lines, {
      preset: 'preserve',
      style: 'css',
      sizing: 'content',
    });

    expect(isSvg(svg)).toBe(true);
    await assertRender('svg-preserve-css', svg, result.lines);
  });

  it('browser with css style', async () => {
    const paragraph = makeParagraph('AAA BBB');
    const result = paragraphLayoutEngine.layout(paragraph, 300);

    const svg = renderToSVG(result.lines, {
      preset: 'browser',
      style: 'css',
      sizing: 'content',
    });

    expect(isSvg(svg)).toBe(true);
    await assertRender('svg-browser-css', svg, result.lines);
  });

  // ── Space between runs ─────────────────────────────────────
  // Text: "AA <bold> A</bold>" — пробел в начале второго run
  // PositioningEngine создаст: [AA][ ][A]
  //   preserve → <tspan>AA</tspan><tspan> </tspan><tspan>A</tspan>
  //   browser  → <tspan>AA</tspan><tspan>A</tspan> (space skipped)

  it('preserve renders space between runs as <tspan> </tspan>', async () => {
    const paragraph = makeMultiRunParagraph([
      { text: 'AA' },
      { text: ' A', style: { fontWeight: 700 } },
    ]);
    const result = paragraphLayoutEngine.layout(paragraph, 300);

    const svg = renderToSVG(result.lines, {
      preset: 'preserve',
      sizing: 'content',
    });

    expect(isSvg(svg)).toBe(true);
    expect(svg).toContain('> </tspan>');
    await assertRender('svg-preserve-space-between-runs', svg, result.lines);
  });

  it('browser skips space between runs (no <tspan> </tspan>)', async () => {
    const paragraph = makeMultiRunParagraph([
      { text: 'AA' },
      { text: ' A', style: { fontWeight: 700 } },
    ]);
    const result = paragraphLayoutEngine.layout(paragraph, 300);

    const svg = renderToSVG(result.lines, {
      preset: 'browser',
      sizing: 'content',
    });

    expect(isSvg(svg)).toBe(true);
    expect(svg).not.toContain('> </tspan>');
    await assertRender('svg-browser-space-between-runs', svg, result.lines);
  });

  // ── Adjacent runs (no space) ───────────────────────────────
  // Text: "C<bold>B</bold>" — без пробела между runs
  // PositioningEngine создаст: [C][B]
  //   preserve → <tspan>C</tspan><tspan>B</tspan> (без space-фрагмента)
  //   browser  → <tspan>C</tspan><tspan>B</tspan> (без space-фрагмента)

  for (const preset of ['preserve', 'browser'] as SvgPreset[]) {
    it(`${preset} adjacent runs without space`, async () => {
      const paragraph = makeMultiRunParagraph([
        { text: 'C' },
        { text: 'B', style: { fontWeight: 700 } },
      ]);
      const result = paragraphLayoutEngine.layout(paragraph, 300);

      const svg = renderToSVG(result.lines, {
        preset,
        sizing: 'content',
      });

      expect(isSvg(svg)).toBe(true);
      // No space fragment between runs
      expect(svg).not.toContain('> </tspan>');
      await assertRender(`svg-${preset}-adjacent-runs`, svg, result.lines);
    });
  }

  it('multi-line with narrow width', async () => {
    const paragraph = makeParagraph('AAA BBB CCC DDD DDDDDD');
    const result = paragraphLayoutEngine.layout(paragraph, 40);

    const svg = renderToSVG(result.lines, {
      preset: 'preserve',
      sizing: 'content',
    });

    expect(isSvg(svg)).toBe(true);
    expect(result.lines.length).toBeGreaterThan(1);
    await assertRender('svg-multiline-narrow', svg, result.lines);
  });
});
