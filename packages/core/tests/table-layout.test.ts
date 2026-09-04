/**
 * table-layout.test.ts — TableLayoutEngine (T0): grid sizing, no colSpan/
 * rowSpan/borders yet.
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { registerUnifont, makeParagraph, makeTextFrame } from './helpers.ts';
import { layoutTableFrame } from '../src/layout/TableLayoutEngine.js';
import type { TableFrame, TableCell } from '../src/types/TableTypes.js';

beforeAll(async () => {
  await registerUnifont();
});

const cell = (text: string, fontSize = 16): TableCell => ({
  content: makeTextFrame([makeParagraph(text, { fontFamily: 'Unifont', fontSize })]),
});

describe('TableLayoutEngine — grid sizing', () => {
  test('column widths follow the widest natural cell in that column', () => {
    const table: TableFrame = {
      rows: [
        { cells: [cell('a'), cell('a very long header cell')] },
        { cells: [cell('bb'), cell('x')] },
      ],
    };
    const r = layoutTableFrame(table);
    const col0 = Math.max(r.rows[0].cells[0].width, r.rows[1].cells[0].width);
    const col1 = Math.max(r.rows[0].cells[1].width, r.rows[1].cells[1].width);
    expect(col1).toBeGreaterThan(col0);
    // every cell in a column shares the same width
    expect(r.rows[0].cells[0].width).toBe(r.rows[1].cells[0].width);
    expect(r.rows[0].cells[1].width).toBe(r.rows[1].cells[1].width);
  });

  test('cells are positioned left-to-right, top-to-bottom with no gap by default', () => {
    const table: TableFrame = { rows: [{ cells: [cell('a'), cell('b')] }, { cells: [cell('c'), cell('d')] }] };
    const r = layoutTableFrame(table);
    const [r0, r1] = r.rows;
    expect(r0.cells[0].x).toBe(0);
    expect(r0.cells[1].x).toBe(r0.cells[0].x + r0.cells[0].width);
    expect(r1.y).toBe(r0.y + r0.height);
    expect(r1.cells[0].x).toBe(r0.cells[0].x); // columns line up
  });

  test('default padding is 8px on all sides, added to natural width/height', () => {
    const table: TableFrame = { rows: [{ cells: [cell('hi')] }] };
    const r = layoutTableFrame(table);
    const c = r.rows[0].cells[0];
    expect(c.padding).toEqual({ top: 8, right: 8, bottom: 8, left: 8 });
    const natural = c.content.content.width;
    expect(c.width).toBeCloseTo(natural + 16, 1);
  });

  test('paddings shorthand: number / [tb,lr] / [t,r,b,l]', () => {
    const num: TableCell = { ...cell('x'), style: { paddings: 4 } };
    const two: TableCell = { ...cell('x'), style: { paddings: [4, 10] } };
    const four: TableCell = { ...cell('x'), style: { paddings: [1, 2, 3, 4] } };
    const r = layoutTableFrame({ rows: [{ cells: [num, two, four] }] });
    expect(r.rows[0].cells[0].padding).toEqual({ top: 4, right: 4, bottom: 4, left: 4 });
    expect(r.rows[0].cells[1].padding).toEqual({ top: 4, right: 10, bottom: 4, left: 10 });
    expect(r.rows[0].cells[2].padding).toEqual({ top: 1, right: 2, bottom: 3, left: 4 });
  });

  test('explicit table width shrinks columns proportionally and wraps text', () => {
    const wide = cell('a rather long piece of cell text that will need to wrap');
    const table: TableFrame = { rows: [{ cells: [wide] }] };
    const auto = layoutTableFrame(table);
    const narrow = layoutTableFrame({ ...table, width: 120 });
    expect(narrow.width).toBeCloseTo(120, 0);
    expect(narrow.rows[0].cells[0].width).toBeLessThan(auto.rows[0].cells[0].width);
    expect(narrow.rows[0].cells[0].content.lines.length).toBeGreaterThan(1);
  });

  test('explicit table width wider than natural grows columns', () => {
    const table: TableFrame = { rows: [{ cells: [cell('a'), cell('b')] }], width: 500 };
    const r = layoutTableFrame(table);
    expect(r.width).toBeCloseTo(500, 0);
  });

  test('columnWidths / rowHeights overrides win over measurement', () => {
    const table: TableFrame = {
      rows: [{ cells: [cell('a'), cell('b')] }],
      columnWidths: [50, 150],
      rowHeights: [40],
    };
    const r = layoutTableFrame(table);
    expect(r.rows[0].cells[0].width).toBe(50);
    expect(r.rows[0].cells[1].width).toBe(150);
    expect(r.rows[0].height).toBe(40);
  });

  test('verticalAlign top/middle/bottom offsets content within an explicit row height', () => {
    const table: TableFrame = {
      rows: [
        {
          cells: [
            { ...cell('x'), style: { verticalAlign: 'top' } },
            { ...cell('x'), style: { verticalAlign: 'middle' } },
            { ...cell('x'), style: { verticalAlign: 'bottom' } },
          ],
        },
      ],
      rowHeights: [200],
    };
    const r = layoutTableFrame(table);
    const [top, mid, bot] = r.rows[0].cells;
    expect(top.verticalOffset).toBe(0);
    expect(mid.verticalOffset).toBeGreaterThan(0);
    expect(bot.verticalOffset).toBeGreaterThan(mid.verticalOffset);
  });

  test('margins offset the whole grid and are included in the outer box', () => {
    const table: TableFrame = { rows: [{ cells: [cell('a')] }], style: { margins: [10, 20] } };
    const r = layoutTableFrame(table);
    expect(r.rows[0].cells[0].x).toBe(20);
    expect(r.rows[0].y).toBe(10);
    expect(r.width).toBeCloseTo(r.rows[0].cells[0].width + 40, 1);
    expect(r.height).toBeCloseTo(r.rows[0].height + 20, 1);
  });

  test('colGaps / rowGaps add space between cells without affecting cell width', () => {
    const table: TableFrame = {
      rows: [{ cells: [cell('a'), cell('a')] }, { cells: [cell('a'), cell('a')] }],
      style: { colGaps: 10, rowGaps: 5 },
    };
    const r = layoutTableFrame(table);
    const c0 = r.rows[0].cells[0], c1 = r.rows[0].cells[1];
    expect(c1.x).toBe(c0.x + c0.width + 10);
    expect(r.rows[1].y).toBe(r.rows[0].y + r.rows[0].height + 5);
  });

  test('bgColor resolves cell → defaultCellStyle, row → defaultRowStyle, table is a separate field', () => {
    const table: TableFrame = {
      rows: [{ cells: [{ ...cell('a'), style: { bgColor: '#f00' } }, cell('b')], style: { bgColor: '#0f0' } }],
      defaultCellStyle: { bgColor: '#eee' },
      style: { bgColor: '#fff' },
    };
    const r = layoutTableFrame(table);
    expect(r.bgColor).toBe('#fff');
    expect(r.rows[0].bgColor).toBe('#0f0');
    expect(r.rows[0].cells[0].bgColor).toBe('#f00'); // own style wins
    expect(r.rows[0].cells[1].bgColor).toBe('#eee'); // falls back to defaultCellStyle
  });

  test('empty table → minimal box, no rows', () => {
    const r = layoutTableFrame({ rows: [] });
    expect(r.rows).toHaveLength(0);
    expect(r.width).toBe(0);
    expect(r.height).toBe(0);
  });

  test('a cell content.width/wrap set by the caller is overridden by the column width', () => {
    const weird = cell('short');
    weird.content.width = 5; // caller-set — must not survive into the table layout
    weird.content.wrap = false;
    const r = layoutTableFrame({ rows: [{ cells: [weird] }] }, {});
    // natural width path still measured it unconstrained, so it's not clipped to 5
    expect(r.rows[0].cells[0].width).toBeGreaterThan(5);
  });
});
