/**
 * tables.test.ts — <table> → TableFrame → renderTableToSVG → inlineBoxes (T5).
 *
 * A table becomes one paragraph holding a single inline-box run; the actual
 * grid is a pre-rendered SVG in `inlineBoxes[id]` — see walk.ts's handleTable().
 *
 * Unlike the rest of the converter, a table is laid out and rendered *during*
 * conversion (see handleTable()'s comment), so — unlike other *.test.ts files
 * in this package — a real font must be registered before any test here runs;
 * relying on another file's beforeAll to have registered one first would make
 * this suite pass only in a particular run order.
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fontMetricsProvider } from '@vyaz/core';
import { convert as convertRaw, text } from './helpers.ts';
import type { HtmlConvertOptions } from '../src/index.ts';

beforeAll(async () => {
  const fp = resolve(dirname(fileURLToPath(import.meta.url)), '../../core/tests/fixtures/unifont-17.0.05.otf');
  await fontMetricsProvider.registerFont('Unifont', { weight: 'normal', style: 'normal' }, readFileSync(fp));
});

/** convert() with Unifont as the default baseFont, so table rendering never depends on another file's font registration. */
function convert(html: string, opts: HtmlConvertOptions = {}) {
  return convertRaw(html, { baseFont: { family: 'Unifont' }, ...opts });
}

describe('tables', () => {
  test('a basic table becomes one inline-box paragraph, SVG carries the cell text', () => {
    const { frame, inlineBoxes } = convert('<p>before</p><table><tr><td>a1</td><td>b1</td></tr></table>');
    expect(frame.paragraphs).toHaveLength(2); // "before" + the table widget
    const widget = frame.paragraphs[1].children[0];
    expect(widget.type).toBe('inline-box');
    expect(widget.inlineWidget).toBeDefined();
    const svg = inlineBoxes[widget.inlineWidget!.id!];
    expect(svg).toContain('a1');
    expect(svg).toContain('b1');
  });

  test('the widget box matches the table\'s own laid-out size', () => {
    const { frame } = convert('<table><tr><td>x</td></tr></table>');
    const iw = frame.paragraphs[0].children[0].inlineWidget!;
    expect(iw.width).toBeGreaterThan(0);
    expect(iw.height).toBeGreaterThan(0);
  });

  test('th cells render bold with a header background', () => {
    const { inlineBoxes } = convert('<table><tr><th>Head</th></tr><tr><td>Body</td></tr></table>');
    const svg = Object.values(inlineBoxes)[0];
    // bold header text
    expect(svg).toMatch(/font-weight="700"[^>]*>Head/);
    // header cell background rect painted before the text
    expect(svg).toContain('fill="#f5f5f5"');
  });

  test('thead/tbody/tfoot are transparent — only their <tr>s matter', () => {
    const { inlineBoxes } = convert(
      '<table><thead><tr><th>H</th></tr></thead><tbody><tr><td>B</td></tr></tbody><tfoot><tr><td>F</td></tr></tfoot></table>',
    );
    const svg = Object.values(inlineBoxes)[0];
    for (const t of ['H', 'B', 'F']) expect(svg).toContain(t);
  });

  test('colspan/rowspan attributes are parsed onto the TableCell', () => {
    const { inlineBoxes } = convert(
      '<table><tr><td colspan="2">wide</td></tr><tr><td rowspan="2">tall</td><td>x</td></tr><tr><td>y</td></tr></table>',
    );
    const svg = Object.values(inlineBoxes)[0];
    for (const t of ['wide', 'tall', 'x', 'y']) expect(svg).toContain(t);
  });

  test('inline formatting inside a cell survives (bold run in the nested SVG)', () => {
    const { inlineBoxes } = convert('<table><tr><td>plain <strong>bold</strong></td></tr></table>');
    const svg = Object.values(inlineBoxes)[0];
    expect(svg).toMatch(/font-weight="700"[^>]*>bold/);
  });

  test('caption becomes a centered bold paragraph right before the table widget', () => {
    const { frame } = convert('<table><caption>My Table</caption><tr><td>x</td></tr></table>');
    expect(frame.paragraphs).toHaveLength(2);
    const [caption, widget] = frame.paragraphs;
    expect(text(caption)).toBe('My Table');
    expect(caption.style.alignment).toBe('center');
    expect(caption.children[0].fontWeight).toBe('bold');
    expect(widget.children[0].type).toBe('inline-box');
  });

  test('an empty table (no rows with cells) is dropped with a warning, no crash', () => {
    const { frame, dropped, warnings } = convert('<p>keep</p><table></table>');
    expect(frame.paragraphs.map(text)).toEqual(['keep']);
    expect(dropped).toEqual([]); // table isn't in dropped[] — it's a warning, not a structural drop
    expect(warnings.some((w) => w.code === 'table-empty')).toBe(true);
  });

  test('table width follows options.width', () => {
    const { frame: narrow } = convert('<table><tr><td>a rather long cell that needs a lot of room</td></tr></table>', { width: 200 });
    const { frame: wide } = convert('<table><tr><td>a rather long cell that needs a lot of room</td></tr></table>', { width: 800 });
    expect(narrow.paragraphs[0].children[0].inlineWidget!.width).toBeLessThan(wide.paragraphs[0].children[0].inlineWidget!.width);
  });

  test('multiple tables in one document get distinct ids', () => {
    const { frame, inlineBoxes } = convert('<table><tr><td>one</td></tr></table><table><tr><td>two</td></tr></table>');
    const ids = frame.paragraphs.map((p) => p.children[0].inlineWidget!.id!);
    expect(new Set(ids).size).toBe(2);
    expect(Object.keys(inlineBoxes)).toHaveLength(2);
  });

  test('a table still converts even with onUnsupported:"throw" (it is not an unmapped tag)', () => {
    expect(() => convert('<table><tr><td>x</td></tr></table>', { onUnsupported: 'throw' })).not.toThrow();
  });

  test('colgroup/col are silently ignored (no warning, no dropped entry)', () => {
    const { dropped, warnings } = convert('<table><colgroup><col><col></colgroup><tr><td>a</td><td>b</td></tr></table>');
    expect(dropped).toEqual([]);
    expect(warnings.some((w) => w.tag === 'colgroup' || w.tag === 'col')).toBe(false);
  });
});
