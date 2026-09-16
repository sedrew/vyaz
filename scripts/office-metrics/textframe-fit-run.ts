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
 * Frames run for **Roboto and Arial**. Arial is vyaz's own default
 * `fontFamily` (`DEFAULT_TEXT_STYLE` in `packages/core/src/types/Document.ts`)
 * and the font the office 1.20/0.75 constants' *predecessor* formula was
 * fitted to (see README "Environment") — but the constants themselves
 * (RESULTS.md) were only ever checked against Roboto + Great Vibes. Arial
 * frames are named with an `_arial` suffix; Roboto frame names are unchanged
 * from before this existed.
 *
 * 1 vyaz unit == 1 pt.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
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

// macOS system Arial locations (same font this repo's Arial-weight tests use
// via `registerArialVariants` in packages/core/tests/helpers.ts, minimized
// here to just the Regular weight — that's all these office cases need).
const ARIAL_PATHS = ['/Library/Fonts/Arial.ttf', '/System/Library/Fonts/Supplemental/Arial.ttf'];

function findArial(): Buffer | null {
  for (const p of ARIAL_PATHS) {
    if (existsSync(p)) return readFileSync(p);
  }
  return null;
}

async function main() {
  await fontMetricsProvider.registerFont(
    'Roboto',
    { weight: 'normal', style: 'normal' },
    readFileSync(resolve(FIX, 'Roboto-VariableFont_wdth,wght.ttf')),
  );

  const families: { name: string; suffix: string }[] = [{ name: 'Roboto', suffix: '' }];
  const arialBuf = findArial();
  if (arialBuf) {
    await fontMetricsProvider.registerFont('Arial', { weight: 'normal', style: 'normal' }, arialBuf);
    families.push({ name: 'Arial', suffix: '_arial' });
  } else {
    console.warn(`Arial not found at ${ARIAL_PATHS.join(' or ')} — skipping Arial frames.`);
  }

  const frames: any[] = [];
  for (const { name: family, suffix } of families) {
    for (const width of WIDTHS_PT) {
      for (const [size, spc] of VARIANTS) {
        const frame: TextFrame = {
          width,
          wrap: true,
          paragraphs: [
            {
              children: [{ type: 'text', text: TEXT, fontFamily: family, fontSize: size } as any],
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
          name: `w${width}__${size}pt_sp${String(spc).replace(/\.0$/, '')}${suffix}`,
          width_pt: width,
          height_pt: round2(r.content.height), // box the generator pins (CSS content box)
          font_family: family,
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
