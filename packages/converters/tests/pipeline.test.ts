/**
 * pipeline.test.ts — htmlToTextFrame → layoutTextFrame → renderToSVG.
 *
 * Proves the converted frame is a valid `@vyaz/core` input and the renderer
 * accepts the `inlineBoxes` map. Uses Unifont (deterministic metrics).
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fontMetricsProvider, layoutTextFrame } from '@vyaz/core';
import { renderToSVG } from '@vyaz/renderer';
import { convert } from './helpers.ts';

beforeAll(async () => {
  const fp = resolve(dirname(fileURLToPath(import.meta.url)), '../../core/tests/fixtures/unifont-17.0.05.otf');
  await fontMetricsProvider.registerFont('Unifont', { weight: 'normal', style: 'normal' }, readFileSync(fp));
});

const HTML = `
  <h1>Report</h1>
  <p>Plain text with <strong>bold</strong>, <em>italic</em>, a <a href="/x">link</a>
     and <code>inline()</code> code.</p>
  <blockquote><p>A quoted paragraph.</p></blockquote>
  <p style="text-align:center">Centered line.<br>Second line.</p>
  <table><tr><th>Col</th></tr><tr><td>table cell text</td></tr></table>
`;

describe('full pipeline', () => {
  test('converts, lays out, and renders to valid SVG — including a table', () => {
    const { frame, inlineBoxes, warnings, dropped } = convert(HTML, {
      width: 500,
      baseFont: { family: 'Unifont', size: 16 },
      monospaceFamily: 'Unifont', // only Unifont is registered in this suite
    });

    expect(frame.paragraphs.length).toBe(5); // h1, p, blockquote>p, centered p, table widget
    expect(warnings.some((w) => w.code === 'link-href-lost')).toBe(false); // href is carried now, not lost
    const linkRun = frame.paragraphs.flatMap((p) => p.children).find((r) => r.text === 'link');
    expect(linkRun?.data).toEqual({ href: '/x' });
    expect(dropped).toEqual([]); // nothing dropped in this sample — the table converts now
    expect(Object.keys(inlineBoxes)).toHaveLength(1);

    const result = layoutTextFrame(frame);
    expect(result.lines.length).toBeGreaterThan(0);

    const svg = renderToSVG(result, { preset: 'browser', inlineBoxes });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Report');
    expect(svg).toContain('bold');
    expect(svg).toContain('Centered line.');
    expect(svg).toContain('table cell text'); // the table's own nested <svg>, spliced in via inlineBoxes
  });

  test('renderToSVG accepts an empty inlineBoxes map when there is nothing to splice', () => {
    const { frame, inlineBoxes } = convert('<p>x</p>', { baseFont: { family: 'Unifont' } });
    expect(inlineBoxes).toEqual({});
    const svg = renderToSVG(layoutTextFrame(frame), { preset: 'flat', inlineBoxes });
    expect(svg).toContain('>x<');
  });
});
