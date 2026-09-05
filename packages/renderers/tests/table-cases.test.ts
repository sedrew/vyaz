/**
 * table-cases.test.ts — golden corpus runner for TableFrame → renderTableToSVG.
 *
 * Sibling of cases.test.ts (same golden-corpus philosophy — presets are
 * *variants* of one scenario, not separate case folders — but a different
 * directory: table-cases/<case>/input.json). Kept out of tests/cases/ on
 * purpose: the docs Cases explorer globs that tree assuming a TextFrame
 * `input.frame` shape, and this one is table-shaped.
 *
 * Two input shapes:
 *   standalone — { table, renders }: layoutTableFrame + renderTableToSVG only.
 *   compose    — { before, table, after, renders, frameWidth? }: the table is
 *     placed as an inline-box widget inside a full TextFrame alongside other
 *     paragraphs (`before`/`after`), through layoutTextFrame + renderToSVG +
 *     inlineBoxes — the actual @vyaz/converters handleTable() flow. Exists because
 *     the inline-box line-height fix (a tall widget must push later paragraphs
 *     down, not overlap them — see ParagraphLayoutEngine's inlineWidgetMetrics)
 *     is only reachable through that composition, not standalone table
 *     rendering.
 *
 *   bun test packages/renderers/tests/table-cases.test.ts          # verify
 *   UPDATE=1 bun test packages/renderers/tests/table-cases.test.ts # regenerate goldens
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { registerUnifont, registerFixtureFonts } from '../../core/tests/helpers.ts';
import { layoutTableFrame, layoutTextFrame } from '@vyaz/core';
import type { TableFrame, Paragraph, TextFrame } from '@vyaz/core';
import { renderTableToSVG } from '../src/TableRenderer.js';
import { renderToSVG } from '../src/SVGRenderer.js';

const DIR = resolve(dirname(fileURLToPath(import.meta.url)), 'table-cases');
const UPDATE = process.env.UPDATE === '1';

beforeAll(async () => {
  await registerUnifont();
  await registerFixtureFonts();
});

const found: { name: string; dir: string }[] = [];
for (const c of readdirSync(DIR)) {
  const cp = resolve(DIR, c);
  if (c.startsWith('_') || !statSync(cp).isDirectory()) continue;
  if (existsSync(resolve(cp, 'input.json'))) found.push({ name: c, dir: cp });
}

/** Standalone: layoutTableFrame + renderTableToSVG directly. */
function renderStandalone(table: TableFrame, r: any): string {
  return renderTableToSVG(layoutTableFrame(table), r);
}

/**
 * Compose: the table becomes one inline-box paragraph between `before` and
 * `after`, exactly like @vyaz/converters's handleTable() — proves a tall table
 * doesn't overlap the paragraph that follows it.
 */
function renderComposed(input: { frameWidth?: number; before?: Paragraph[]; table: TableFrame; after?: Paragraph[] }, r: any): string {
  const tableResult = layoutTableFrame(input.table);
  const svg = renderTableToSVG(tableResult);
  const id = 'table-0';
  const tableParagraph: Paragraph = {
    style: { alignment: 'left', lineHeight: 1.4, spaceBefore: 0, spaceAfter: 12, whiteSpace: 'normal' },
    children: [{
      type: 'inline-box',
      text: '￼',
      fontFamily: 'Unifont',
      fontSize: 16,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#000000',
      inlineWidget: { width: tableResult.width, height: tableResult.height, id },
    }],
  };
  const frame: TextFrame = {
    width: input.frameWidth,
    wrap: true,
    paragraphs: [...(input.before ?? []), tableParagraph, ...(input.after ?? [])],
  };
  const layout = layoutTextFrame(frame);
  return renderToSVG(layout, { ...r, inlineBoxes: { [id]: svg } });
}

describe('table cases', () => {
  for (const { name, dir } of found) {
    const input = JSON.parse(readFileSync(resolve(dir, 'input.json'), 'utf8'));
    for (const [variant, r] of Object.entries<any>(input.renders)) {
      test(`${name} [${variant}]`, () => {
        const svg = (input.before || input.after ? renderComposed(input, r) : renderStandalone(input.table, r)).trim();
        const snap = resolve(dir, `${variant}.svg`);
        if (UPDATE || !existsSync(snap)) {
          writeFileSync(snap, svg + '\n');
          return;
        }
        expect(svg).toBe(readFileSync(snap, 'utf8').trim());
      });
    }
  }
});
