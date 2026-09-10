/**
 * textframe-fit-run.ts — vyaz side of the fixed-rectangle round-trip.
 *
 *   bun scripts/office-metrics/textframe-fit-run.ts
 *   → writes scripts/office-metrics/textframe-fit.json
 *
 * Flow (see RESULTS.md):
 *   1. HERE: feed (text, width) to `layoutTextFrame(…, { mode: 'office' })` and
 *      read back `content.height` — where the last line box ends — plus the
 *      per-line breaks / baselines vyaz chose.
 *   2. `gen-textframe-fit.py` reads this JSON and builds a PowerPoint TextBox at
 *      **exactly** that width × height (wrap-only, no autofit).
 *   3. Export each slide to SVG. If vyaz's height is right, PowerPoint fills the
 *      box with the same lines, last line flush with the bottom, no clip.
 *
 * 1 vyaz unit == 1 pt.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fontMetricsProvider, layoutTextFrame } from '../../packages/core/src/index.ts';
import type { TextFrame } from '../../packages/core/src/index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = resolve(HERE, '../../packages/core/tests/fixtures');

const TEXT =
  'The quick brown fox jumps over the lazy dog while a TextFrame measures ' +
  'every line box and decides where each word wraps inside the given ' +
  'rectangle, with no autofit shrinking the text to make it fit.';

const WIDTHS_PT = [140, 200, 300];
// (fontSize pt, lineSpacing == DrawingML spcPct as a float)
const VARIANTS: [number, number][] = [
  [18, 1.0],
  [18, 2.0],
  [24, 1.0],
];

async function main() {
  await fontMetricsProvider.registerFont(
    'Roboto',
    { weight: 'normal', style: 'normal' },
    readFileSync(resolve(FIX, 'Roboto-VariableFont_wdth,wght.ttf')),
  );

  const frames: any[] = [];
  for (const width of WIDTHS_PT) {
    for (const [size, spc] of VARIANTS) {
      const frame: TextFrame = {
        width,
        wrap: true,
        paragraphs: [
          {
            children: [{ type: 'text', text: TEXT, fontFamily: 'Roboto', fontSize: size } as any],
            style: { alignment: 'left', lineHeight: spc, spaceBefore: 0, spaceAfter: 0, whiteSpace: 'normal' },
          },
        ],
      };
      const r = layoutTextFrame(frame, { mode: 'office' });
      const lines = r.lines.map((l) => ({
        text: l.spans.map((s) => s.text).join(''),
        y: round2(l.y),
        height: round2(l.height),
        baseline_in_box: round2(l.baseline),
        baseline_abs: round2(l.y + l.baseline),
      }));
      frames.push({
        slide: frames.length + 1,
        name: `w${width}__${size}pt_sp${String(spc).replace(/\.0$/, '')}`,
        width_pt: width,
        height_pt: round2(r.content.height), // box the generator pins (CSS content box)
        font_family: 'Roboto',
        font_size_pt: size,
        line_spacing: spc,
        text: TEXT,
        vyaz: {
          line_count: lines.length,
          content_height: round2(r.content.height),   // Σ line boxes (leading kept)
          textbox_height: round2(r.textBox.height),   // trailing leading trimmed
          slack: round2(r.content.height - r.textBox.height),
          lines,
        },
      });
    }
  }

  const out = resolve(HERE, 'textframe-fit.json');
  writeFileSync(out, JSON.stringify({ unit: 'pt', mode: 'office', source: 'vyaz layoutTextFrame', frames }, null, 2) + '\n');
  console.log(`wrote ${out} (${frames.length} frames)`);
  for (const f of frames) {
    console.log(`  ${f.name.padEnd(20)} ${f.width_pt}×${f.height_pt}pt  ${f.vyaz.line_count} lines`);
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;
main();
