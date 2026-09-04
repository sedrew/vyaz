/**
 * table-layout.test.ts — TableLayoutEngine.
 * T0: grid sizing (no spans, no borders). T1: colSpan / rowSpan placement +
 * deficit-widen sizing. T2 (borders) not covered here yet.
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

  test('a plain T0 cell reports colSpan/rowSpan = 1 in the result', () => {
    const r = layoutTableFrame({ rows: [{ cells: [cell('a')] }] });
    expect(r.rows[0].cells[0]).toMatchObject({ colSpan: 1, rowSpan: 1 });
  });
});

describe('TableLayoutEngine — colSpan / rowSpan (T1)', () => {
  test('colSpan: a header cell spans two columns; the row below lines up under it', () => {
    const table: TableFrame = {
      rows: [
        { cells: [{ ...cell('Header'), colSpan: 2 }] },
        { cells: [cell('a'), cell('bbbbbbbbbbbbbbbbbbbb')] },
      ],
    };
    const r = layoutTableFrame(table);
    const header = r.rows[0].cells[0];
    const [a, b] = r.rows[1].cells;
    expect(header.colSpan).toBe(2);
    expect(header.x).toBe(a.x);
    expect(header.width).toBeCloseTo(a.width + b.width, 1); // no gaps by default
    expect(b.x).toBe(a.x + a.width);
  });

  test('colSpan: when the spanning cell is wider than its columns, they widen (never shrink)', () => {
    const table: TableFrame = {
      rows: [
        { cells: [{ ...cell('a very long spanning header that needs lots of room'), colSpan: 2 }] },
        { cells: [cell('a'), cell('b')] },
      ],
    };
    const r = layoutTableFrame(table);
    const header = r.rows[0].cells[0];
    const [a, b] = r.rows[1].cells;
    expect(header.width).toBeCloseTo(a.width + b.width, 1);
    // both narrow columns absorbed roughly half the deficit each
    expect(a.width).toBeCloseTo(b.width, 1);
    expect(a.width).toBeGreaterThan(20); // wider than a lone "a"/"b" cell would need
  });

  test('colSpan never shrinks a column below what its own single-span cells need', () => {
    const table: TableFrame = {
      rows: [
        { cells: [{ ...cell('x'), colSpan: 2 }] },
        { cells: [cell('a very long cell that sets column 0 width on its own'), cell('b')] },
      ],
    };
    const r = layoutTableFrame(table);
    const [a] = r.rows[1].cells;
    // column 0 is driven by the long cell, not shrunk by the short spanning header
    expect(a.width).toBeGreaterThan(100);
  });

  test('rowSpan: a cell spanning two rows occupies col 0; the next row\'s lone cell lands in col 1', () => {
    const table: TableFrame = {
      rows: [
        { cells: [{ ...cell('side'), rowSpan: 2 }, cell('r0c1')] },
        { cells: [cell('r1c1')] },
      ],
    };
    const r = layoutTableFrame(table);
    expect(r.rows[0].cells).toHaveLength(2);
    expect(r.rows[1].cells).toHaveLength(1);
    const side = r.rows[0].cells[0];
    const r0c1 = r.rows[0].cells[1];
    const r1c1 = r.rows[1].cells[0];
    expect(side.rowSpan).toBe(2);
    expect(r1c1.x).toBe(r0c1.x); // column 1, same as the cell above it
    expect(side.height).toBeCloseTo(r.rows[0].height + r.rows[1].height, 1);
  });

  test('rowSpan: when the spanning cell is taller than its rows, they widen (never shrink)', () => {
    const tall = { content: makeTextFrame([makeParagraph('one', { fontFamily: 'Unifont', fontSize: 16 }), makeParagraph('two', { fontFamily: 'Unifont', fontSize: 16 }), makeParagraph('three', { fontFamily: 'Unifont', fontSize: 16 })]) };
    const table: TableFrame = {
      rows: [
        { cells: [{ ...tall, rowSpan: 2 }, cell('short0')] },
        { cells: [cell('short1')] },
      ],
    };
    const r = layoutTableFrame(table);
    const side = r.rows[0].cells[0];
    expect(side.height).toBeCloseTo(r.rows[0].height + r.rows[1].height, 1);
    // both rows absorbed roughly half the deficit each (short cells barely need any height)
    expect(r.rows[0].height).toBeCloseTo(r.rows[1].height, 1);
  });

  test('a cell can span both rows and columns at once', () => {
    const table: TableFrame = {
      rows: [
        { cells: [{ ...cell('big'), colSpan: 2, rowSpan: 2 }, cell('r0c2')] },
        { cells: [cell('r1c2')] },
        { cells: [cell('r2c0'), cell('r2c1'), cell('r2c2')] },
      ],
    };
    const r = layoutTableFrame(table);
    const big = r.rows[0].cells[0];
    expect(big.colSpan).toBe(2);
    expect(big.rowSpan).toBe(2);
    expect(big.width).toBeCloseTo(r.rows[2].cells[0].width + r.rows[2].cells[1].width, 1);
    expect(big.height).toBeCloseTo(r.rows[0].height + r.rows[1].height, 1);
    // row 1's only real cell (r1c2) still lands in column 2, past the occupied span
    expect(r.rows[1].cells[0].x).toBe(r.rows[2].cells[2].x);
  });
});
