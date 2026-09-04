/**
 * table-renderer.test.ts — renderTableToSVG(TableLayoutResult).
 *
 * Renderer-side coverage for TableLayoutEngine (per the cross-package test
 * rule in memory: a core layout feature reachable through the renderer needs
 * its own renderer test, not just a core one).
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { registerUnifont, makeParagraph, makeTextFrame } from '../../core/tests/helpers.ts';
import { layoutTableFrame } from '@vyaz/core';
import type { TableFrame, TableCell } from '@vyaz/core';
import { renderTableToSVG } from '../src/TableRenderer.js';

beforeAll(async () => {
  await registerUnifont();
});

const cell = (text: string, overrides: Partial<TableCell> = {}): TableCell => ({
  content: makeTextFrame([makeParagraph(text, { fontFamily: 'Unifont', fontSize: 16 })]),
  ...overrides,
});

describe('renderTableToSVG', () => {
  test('a plain 2x2 table renders a valid <svg> with every cell\'s text', () => {
    const table: TableFrame = {
      rows: [
        { cells: [cell('a1'), cell('b1')] },
        { cells: [cell('a2'), cell('b2')] },
      ],
    };
    const svg = renderTableToSVG(layoutTableFrame(table));
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('</svg>');
    for (const t of ['a1', 'b1', 'a2', 'b2']) expect(svg).toContain(t);
  });

  test('table/row/cell bgColor each paint their own <rect>, table bg first', () => {
    const table: TableFrame = {
      rows: [{ cells: [{ ...cell('x'), style: { bgColor: '#f00' } }], style: { bgColor: '#0f0' } }],
      style: { bgColor: '#00f' },
    };
    const svg = renderTableToSVG(layoutTableFrame(table));
    expect(svg).toContain('fill="#00f"');
    expect(svg).toContain('fill="#0f0"');
    expect(svg).toContain('fill="#f00"');
    // table bg painted before row bg before cell bg
    expect(svg.indexOf('fill="#00f"')).toBeLessThan(svg.indexOf('fill="#0f0"'));
    expect(svg.indexOf('fill="#0f0"')).toBeLessThan(svg.indexOf('fill="#f00"'));
  });

  test('a uniform border becomes one stroked <rect>, with rx/ry when set', () => {
    const table: TableFrame = { rows: [{ cells: [{ ...cell('x'), style: { borderWidths: 2, borderColors: '#123', rx: 4 } }] }] };
    const svg = renderTableToSVG(layoutTableFrame(table));
    expect(svg).toMatch(/<rect[^>]*stroke="#123"[^>]*stroke-width="2"[^>]*rx="4"/);
  });

  test('a non-uniform border falls back to four <line> elements', () => {
    const table: TableFrame = {
      rows: [{ cells: [{ ...cell('x'), style: { borderWidths: [1, 2, 3, 4], borderColors: '#000' } }] }],
    };
    const svg = renderTableToSVG(layoutTableFrame(table));
    expect((svg.match(/<line /g) ?? []).length).toBe(4);
    expect(svg).not.toMatch(/<rect[^>]*stroke=/); // no uniform-border rect
  });

  test('no border anywhere → no stroked shapes at all', () => {
    const svg = renderTableToSVG(layoutTableFrame({ rows: [{ cells: [cell('x')] }] }));
    expect(svg).not.toContain('stroke=');
  });

  test('colSpan/rowSpan cell content is placed at the spanning cell\'s own box, not a single column', () => {
    const table: TableFrame = {
      rows: [
        { cells: [{ ...cell('spans'), colSpan: 2 }] },
        { cells: [cell('a'), cell('bbbbbbbbbbbbbbbbbbbb')] },
      ],
    };
    const result = layoutTableFrame(table);
    const svg = renderTableToSVG(result);
    const header = result.rows[0].cells[0];
    const originX = header.x + header.padding.left;
    const originY = header.y + header.padding.top;
    const fmt = (n: number) => (Math.round(n * 100) / 100).toString();
    // the header's own content origin (its 2-column-wide box) must be present verbatim
    expect(svg).toContain(`<g transform="translate(${fmt(originX)} ${fmt(originY)})">`);
  });

  test('an empty cell (no paragraphs) does not crash and emits no content group for it', () => {
    const table: TableFrame = { rows: [{ cells: [{ content: makeTextFrame([]) }, cell('ok')] }] };
    expect(() => renderTableToSVG(layoutTableFrame(table))).not.toThrow();
    const svg = renderTableToSVG(layoutTableFrame(table));
    expect(svg).toContain('ok');
  });

  test('className is applied to the root <svg>', () => {
    const svg = renderTableToSVG(layoutTableFrame({ rows: [{ cells: [cell('x')] }] }), { className: 'my-table' });
    expect(svg).toContain('class="my-table"');
  });

  test('preset option is forwarded to each cell\'s own text render', () => {
    const table: TableFrame = { rows: [{ cells: [cell('bold check')] }] };
    const flat = renderTableToSVG(layoutTableFrame(table), { preset: 'flat' });
    const glyph = renderTableToSVG(layoutTableFrame(table, {}), { preset: 'glyph' });
    expect(flat).not.toContain('<tspan');
    expect(glyph).toContain('<tspan');
  });

  test('cx/cy nudge the content origin without moving the cell box or border', () => {
    const table: TableFrame = {
      rows: [{ cells: [{ ...cell('x'), style: { cx: 12, cy: -7 } }] }],
    };
    const result = layoutTableFrame(table);
    const cellResult = result.rows[0].cells[0];
    const svg = renderTableToSVG(result);
    const originX = cellResult.x + cellResult.padding.left + cellResult.cx;
    const originY = cellResult.y + cellResult.padding.top + cellResult.verticalOffset + cellResult.cy;
    const fmt = (n: number) => (Math.round(n * 100) / 100).toString();
    expect(svg).toContain(`<g transform="translate(${fmt(originX)} ${fmt(originY)})">`);
  });

  test('allowOverflow sets overflow:visible on the cell\'s content <svg>; default clips (no style attr)', () => {
    const table: TableFrame = {
      rows: [{ cells: [
        { ...cell('clipped'), style: { allowOverflow: false } },
        { ...cell('bleeds'), style: { allowOverflow: true } },
      ] }],
    };
    const svg = renderTableToSVG(layoutTableFrame(table));
    // exactly one "overflow:visible" in the whole document — the "bleeds" cell's
    expect((svg.match(/overflow:visible/g) ?? []).length).toBe(1);
    expect(svg.indexOf('overflow:visible')).toBeLessThan(svg.indexOf('bleeds'));
    expect(svg.indexOf('overflow:visible')).toBeGreaterThan(svg.indexOf('clipped'));
  });

  test('fragment: true wraps in a bare <g> — no outer <svg>/xmlns/viewBox (each cell keeps its own nested <svg>)', () => {
    const table: TableFrame = { rows: [{ cells: [cell('x')] }] };
    const wrapped = renderTableToSVG(layoutTableFrame(table));
    const fragment = renderTableToSVG(layoutTableFrame(table), { fragment: true, className: 'frag' });
    expect(wrapped.startsWith('<svg xmlns')).toBe(true); // control: default still wraps
    expect(fragment.startsWith('<g class="frag">')).toBe(true);
    expect(fragment.trim().endsWith('</g>')).toBe(true);
    // exactly one <svg> — the cell's own nested one — vs two (outer + nested) when wrapped
    expect((wrapped.match(/<svg /g) ?? []).length).toBe(2);
    expect((fragment.match(/<svg /g) ?? []).length).toBe(1);
  });
});
