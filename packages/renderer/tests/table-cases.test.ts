/**
 * table-cases.test.ts — golden corpus runner for TableFrame → renderTableToSVG.
 *
 * Sibling of cases.test.ts (same golden-corpus philosophy — presets are
 * *variants* of one scenario, not separate case folders — but a different
 * directory: table-cases/<case>/input.json declares { table, renders }.
 * Kept out of tests/cases/ on purpose: the docs Cases explorer globs that
 * tree assuming a TextFrame `input.frame` shape, and this one is a TableFrame.
 *
 *   bun test packages/renderer/tests/table-cases.test.ts          # verify
 *   UPDATE=1 bun test packages/renderer/tests/table-cases.test.ts # regenerate goldens
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { registerUnifont, registerFixtureFonts } from '../../core/tests/helpers.ts';
import { layoutTableFrame } from '@vyaz/core';
import type { TableFrame } from '@vyaz/core';
import { renderTableToSVG } from '../src/TableRenderer.js';

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

describe('table cases', () => {
  for (const { name, dir } of found) {
    const input = JSON.parse(readFileSync(resolve(dir, 'input.json'), 'utf8')) as {
      table: TableFrame;
      renders: Record<string, any>;
    };
    for (const [variant, r] of Object.entries(input.renders)) {
      test(`${name} [${variant}]`, () => {
        const result = layoutTableFrame(input.table);
        const svg = renderTableToSVG(result, r).trim();
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
