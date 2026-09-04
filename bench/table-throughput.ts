/**
 * table-throughput.ts — TableFrame layout + render throughput at scale.
 *
 *   bun run bench/table-throughput.ts                        # 100x100 (10,000 cells)
 *   BENCH_ROWS=20 BENCH_COLS=20 bun run bench/table-throughput.ts
 *   BENCH_OUT=/tmp/table.svg bun run bench/table-throughput.ts   # also write the SVG
 *
 * Measures layoutTableFrame() and renderTableToSVG() on a header row + an
 * R x C multiplication-table body, center-aligned (the alignment that used
 * to blow up on an auto-width natural-width measurement pass — see the
 * "auto-width + center/right" PositioningEngine fix). Unifont, so numbers
 * are machine-stable.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fontMetricsProvider } from '../packages/core/src/measure/FontMetricsProvider.js';
import { layoutTableFrame } from '../packages/core/src/layout/TableLayoutEngine.js';
import { renderTableToSVG } from '../packages/renderer/src/TableRenderer.js';
import type { TableFrame, TableCell, TableRow } from '../packages/core/src/types/TableTypes.js';

const ROWS = Number(process.env.BENCH_ROWS ?? 100);
const COLS = Number(process.env.BENCH_COLS ?? 100);
const OUT = process.env.BENCH_OUT;

const FONT = resolve(import.meta.dir, '../packages/core/tests/fixtures/unifont-17.0.05.otf');
await fontMetricsProvider.registerFont('Unifont', { weight: 'normal', style: 'normal' }, readFileSync(FONT));

const CELL_STYLE = { paddings: 4, borderWidths: 1, borderColors: '#c0c8d4' };

function cell(text: string): TableCell {
  return {
    content: {
      wrap: true,
      paragraphs: [{
        style: { alignment: 'center', lineHeight: 1.2, spaceBefore: 0, spaceAfter: 0 },
        children: [{ type: 'text', text, fontFamily: 'Unifont', fontSize: 12, fontWeight: 'normal', fontStyle: 'normal', color: '#111' }],
      }],
    },
    style: CELL_STYLE,
  };
}

function buildTable(rows: number, cols: number): TableFrame {
  const header: TableRow = {
    style: { bgColor: '#e9ecf2' },
    cells: [cell('#'), ...Array.from({ length: cols }, (_, i) => cell(String(i + 1)))],
  };
  const body: TableRow[] = [];
  for (let r = 1; r <= rows; r++) {
    const cells: TableCell[] = [cell(String(r))];
    for (let c = 1; c <= cols; c++) cells.push(cell(String(r * c)));
    body.push({ cells });
  }
  return { rows: [header, ...body], defaultCellStyle: CELL_STYLE };
}

const table = buildTable(ROWS, COLS);
const cellCount = (ROWS + 1) * (COLS + 1);

const t0 = performance.now();
const result = layoutTableFrame(table);
const t1 = performance.now();
const svg = renderTableToSVG(result, { preset: 'flat' });
const t2 = performance.now();

console.log(`grid: ${ROWS + 1} x ${COLS + 1} = ${cellCount} cells`);
console.log(`table size: ${result.width.toFixed(0)} x ${result.height.toFixed(0)} px`);
console.log(`layout: ${(t1 - t0).toFixed(1)} ms`);
console.log(`render: ${(t2 - t1).toFixed(1)} ms`);
console.log(`svg: ${(svg.length / 1024 / 1024).toFixed(2)} MB`);

if (OUT) {
  writeFileSync(OUT, svg);
  console.log(`written: ${OUT}`);
}
