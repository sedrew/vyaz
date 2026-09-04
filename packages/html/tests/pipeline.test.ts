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
  <table><tr><td>dropped</td></tr></table>
`;

describe('full pipeline', () => {
  test('converts, lays out, and renders to valid SVG', () => {
    const { frame, warnings, dropped } = convert(HTML, {
      width: 500,
      baseFont: { family: 'Unifont', size: 16 },
      monospaceFamily: 'Unifont', // only Unifont is registered in this suite
    });

    expect(frame.paragraphs.length).toBe(4); // h1, p, blockquote>p, centered p
    expect(warnings.some((w) => w.code === 'link-href-lost')).toBe(true);
    expect(dropped.map((d) => d.tag)).toContain('table');

    const result = layoutTextFrame(frame);
    expect(result.lines.length).toBeGreaterThan(0);

    const svg = renderToSVG(result, { preset: 'browser' });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Report');
    expect(svg).toContain('bold');
    expect(svg).toContain('Centered line.');
  });

  test('renderToSVG accepts the inlineBoxes map (empty in Phase 0–2)', () => {
    const { frame, inlineBoxes } = convert('<p>x</p>', { baseFont: { family: 'Unifont' } });
    const svg = renderToSVG(layoutTextFrame(frame), { preset: 'flat', inlineBoxes });
    expect(svg).toContain('>x<');
  });
});
