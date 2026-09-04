/**
 * report.ts — score fontkit measurement profiles against the browser oracle.
 *
 *   bun scripts/browser-metrics/report.ts
 *   → prints a table + writes scripts/browser-metrics/report.md
 *
 * For every frozen oracle entry it measures the same string with fontkit under
 * each candidate profile and reports |fontkitPx − browserSvgPx|, grouped by
 * (family, script, category). Answers "which fontkit parameters match the
 * browser" and feeds the tolerances in browser-metrics.test.ts.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fontMetricsProvider, createFontFace, measurePx } from '../../packages/core/src/index.ts';
import { oracleDir, CORPUS, registerOracleFont } from './_shared.ts';

const HERE = dirname(fileURLToPath(import.meta.url));

const PROFILES: { name: string; prof: any }[] = [
  { name: 'advance', prof: { engine: 'advance' } },
  { name: 'shape', prof: { engine: 'shape' } },
  { name: 'shape-noliga', prof: { engine: 'shape', features: { liga: false, clig: false, dlig: false } } },
];

type Row = { key: string; n: number; sum: number; abs: number[] };
const rows = new Map<string, Row>();
const bump = (key: string, err: number) => {
  let r = rows.get(key);
  if (!r) rows.set(key, (r = { key, n: 0, sum: 0, abs: [] }));
  r.n++; r.sum += err; r.abs.push(Math.abs(err));
};
const pct = (a: number[], p: number) => {
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};

for (const file of readdirSync(oracleDir).filter((f) => f.endsWith('.json'))) {
  const doc = JSON.parse(readFileSync(resolve(oracleDir, file), 'utf8'));
  const { family, weight, variation } = doc.meta;
  const fontAt = await registerOracleFont(fontMetricsProvider, createFontFace, family, weight, variation);

  for (const e of doc.entries) {
    const font = fontAt(e.size);
    const scale = e.size / font.unitsPerEm;
    for (const { name, prof } of PROFILES) {
      const px = measurePx(font._raw, scale, e.size, e.s, prof);
      bump(`${family}\t${e.script}\t${e.category}\t${name}`, px - e.svgPx);
    }
  }
}

const lines: string[] = [
  '# Browser-metrics calibration report',
  '',
  `Oracle: Chrome (see \`browser-metrics/*.json\` meta). Error = fontkitPx − browserSvgPx, px, across sizes ${JSON.stringify(CORPUS.sizes)}.`,
  'Fonts with an `opsz` axis are instanced per size (`font-optical-sizing: auto`).',
  '',
  '| family | script | category | profile | n | mean | meanAbs | p95Abs | maxAbs |',
  '|---|---|---|---|--:|--:|--:|--:|--:|',
];
for (const r of [...rows.values()].sort((a, b) => a.key.localeCompare(b.key))) {
  const [family, script, category, profile] = r.key.split('\t');
  const meanAbs = r.abs.reduce((x, y) => x + y, 0) / r.n;
  lines.push(
    `| ${family} | ${script} | ${category} | ${profile} | ${r.n} | ${(r.sum / r.n).toFixed(2)} | ${meanAbs.toFixed(2)} | ${pct(r.abs, 0.95).toFixed(2)} | ${Math.max(...r.abs).toFixed(2)} |`,
  );
}
const md = lines.join('\n') + '\n';
writeFileSync(resolve(HERE, 'report.md'), md);
console.log(md);
