/**
 * gen-arial-diagnostic.ts — single-slide Arial line-box diagnostic deck.
 *
 * Follow-up to the two hand-made cases the user found ("в 2 раза" 12/32pt
 * mixed, "Диалог с сотрудниками" 40pt bold): both showed vyaz's `textBox`
 * running short of where PowerPoint actually renders text, and font-metrics
 * analysis found Arial's own OS/2 ratios (typoAscFrac ≈ 0.776, win/upm ≈
 * 1.117) differ from Roboto's (0.750, 1.200 — the values the office-mode
 * `1.20` / `0.75` constants were effectively calibrated on; see RESULTS.md
 * "Still open" #5 — this is the untested font it asks for).
 *
 * One slide, **N cases in a row**, each case = ONE shape:
 *   - text, underlined (baseline reference line, easy to read off an export)
 *   - shape sized to vyaz `content.width × content.height` (mode:'office',
 *     wrap:false — single unwrapped line, so content == exactly one line box)
 *   - **red outline** on the shape itself (the box being tested)
 *   - a thin **blue marker line** at `y = textBox.height` inside the box —
 *     where the box would end if sized by `textBox` (trimmed) instead
 *
 * After opening/saving in PowerPoint and exporting (whole slide, or select
 * one case + Export ▸ SVG), for each case you get three independent
 * reference lines to eyeball against the rendered glyphs: the red box top,
 * the blue `textBox` marker, and the red box bottom (`content`) — plus the
 * underline itself pins the baseline exactly (no more guessing baseline
 * position from where letters visually "look" aligned).
 *
 * Object names embed the predicted numbers, e.g.
 *   `arial-mixed-12-32__c38.40_t36.11` → content.height=38.40, textBox.height=36.11
 * so a report back doesn't need this file re-run to decode.
 *
 *   bun scripts/office-metrics/gen-arial-diagnostic.ts
 *   → arial-diagnostic.pptx (open, save, export)
 */
import pptxgen from 'pptxgenjs';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fontMetricsProvider, layoutTextFrame } from '../../packages/core/src/index.ts';
import type { TextFrame } from '../../packages/core/src/index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const PT2IN = (pt: number) => pt / 72;

const ARIAL_REGULAR = ['/Library/Fonts/Arial.ttf', '/System/Library/Fonts/Supplemental/Arial.ttf'];
const ARIAL_BOLD = ['/Library/Fonts/Arial Bold.ttf', '/System/Library/Fonts/Supplemental/Arial Bold.ttf'];

function findFont(paths: string[]): Buffer {
  for (const p of paths) if (existsSync(p)) return readFileSync(p);
  throw new Error(`none of ${paths.join(', ')} found — this deck needs system Arial`);
}

interface Run {
  text: string;
  sizePt: number;
  bold?: boolean;
}

interface Case {
  name: string;
  runs: Run[];
  lineSpacing: number;
  /** which row on the slide (1 = original row, 2 = new row, two lines below row 1) */
  row?: number;
}

// The two cases the user already found, plus neighbors to triangulate the
// model: single-size at several sizes/weights, and mixed-size at a second
// small/big ratio, and the office `lnSpc` multiplier held at non-1.0 (in case
// the Arial gap is spcPct-dependent rather than a flat per-line offset).
const CASES: Case[] = [
  { name: 'arial-12', runs: [{ text: 'Single size line at twelve point', sizePt: 12 }], lineSpacing: 1.0 },
  { name: 'arial-18', runs: [{ text: 'Single size line at eighteen point', sizePt: 18 }], lineSpacing: 1.0 },
  { name: 'arial-24', runs: [{ text: 'Single size line at 24pt', sizePt: 24 }], lineSpacing: 1.0 },
  { name: 'arial-32', runs: [{ text: 'Single size line at 32pt', sizePt: 32 }], lineSpacing: 1.0 },
  { name: 'arial-40-bold', runs: [{ text: 'Диалог с сотрудниками', sizePt: 40, bold: true }], lineSpacing: 1.0 }, // exact user case 2
  {
    name: 'arial-mixed-12-32',
    runs: [
      { text: 'в ', sizePt: 12 },
      { text: '2', sizePt: 32 },
      { text: ' раза', sizePt: 12 },
    ],
    lineSpacing: 1.0,
  }, // exact user case 1
  {
    name: 'arial-mixed-18-36',
    runs: [
      { text: 'small ', sizePt: 18 },
      { text: 'BIG', sizePt: 36 },
      { text: ' small', sizePt: 18 },
    ],
    lineSpacing: 1.0,
  }, // same ratio as the Roboto ls-mixed golden, but Arial
  { name: 'arial-18-ls150', runs: [{ text: 'Line spacing 1.5 at 18pt', sizePt: 18 }], lineSpacing: 1.5 },
  { name: 'arial-18-ls200', runs: [{ text: 'Line spacing 2.0 at 18pt', sizePt: 18 }], lineSpacing: 2.0 },

  // All-caps: no descenders (g/y/p/q, Cyrillic р/у/ф) at all — isolates
  // cap-height/ascent-only behaviour from the mixed-case baseline analysis
  // above (whose diffs may partly be a real-descent artifact, not purely the
  // 0.75-vs-Arial's-0.776 ascent-ratio gap). Same size/weight/text length as
  // existing cases where possible for a direct before/after comparison.
  { name: 'arial-caps-18', runs: [{ text: 'SINGLE SIZE LINE AT EIGHTEEN POINT', sizePt: 18 }], lineSpacing: 1.0 },
  { name: 'arial-caps-32', runs: [{ text: 'SINGLE SIZE LINE AT 32PT', sizePt: 32 }], lineSpacing: 1.0 },
  // exact uppercase twin of arial-40-bold — only casing differs, everything
  // else (text, size, weight, spacing) identical
  { name: 'arial-caps-40-bold', runs: [{ text: 'ДИАЛОГ С СОТРУДНИКАМИ', sizePt: 40, bold: true }], lineSpacing: 1.0 },
  // uppercase twin of arial-mixed-12-32 — checks whether the mixed-run
  // "extra ~2.3pt" offset also shrinks once descenders are removed
  {
    name: 'arial-mixed-12-32-caps',
    runs: [
      { text: 'В ', sizePt: 12 },
      { text: '2', sizePt: 32 },
      { text: ' РАЗА', sizePt: 12 },
    ],
    lineSpacing: 1.0,
  },

  // spacing progression, row 2: ls150/ls200 (row 1) gave ratios 0.744/0.750 —
  // *lower* than the spcPct=100% ratio (0.783), not scaling proportionally
  // with content.height as a single fixed ratio would predict. 125%/175%
  // fill in the gaps either side of 150% to see whether that drop is a
  // smooth trend or something else (e.g. 150%/200% specifically).
  { name: 'arial-18-ls125', runs: [{ text: 'Line spacing 1.25 at 18pt', sizePt: 18 }], lineSpacing: 1.25, row: 2 },
  { name: 'arial-18-ls175', runs: [{ text: 'Line spacing 1.75 at 18pt', sizePt: 18 }], lineSpacing: 1.75, row: 2 },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

async function main() {
  await fontMetricsProvider.registerFont('Arial', { weight: 'normal', style: 'normal' }, findFont(ARIAL_REGULAR));
  await fontMetricsProvider.registerFont('Arial', { weight: 'bold', style: 'normal' }, findFont(ARIAL_BOLD));

  const p = new pptxgen();
  p.defineLayout({ name: 'VYAZ_16X9', width: 13.333, height: 7.5 });
  p.layout = 'VYAZ_16X9';
  const slide = p.addSlide();

  const xStartIn = PT2IN(0.4 * 72);
  const gapIn = PT2IN(24);
  const row1TopIn = PT2IN(0.5 * 72);
  // row 2 starts two lines below row 1's tallest box (48pt, the 40pt-bold
  // cases) — 48pt box + a 2-line gap at a nominal 24pt line height
  const row2TopIn = row1TopIn + PT2IN(48) + PT2IN(2 * 24);
  const rowTopIn: Record<number, number> = { 1: row1TopIn, 2: row2TopIn };

  let xIn = xStartIn;
  let currentRow = 1;
  console.log(`${CASES.length} cases:`);
  for (const c of CASES) {
    const row = c.row ?? 1;
    if (row !== currentRow) {
      currentRow = row;
      xIn = xStartIn; // new row starts back at the left edge
    }
    const topIn = rowTopIn[row];
    const frame: TextFrame = {
      wrap: false,
      paragraphs: [
        {
          children: c.runs.map((r) => ({
            type: 'text',
            text: r.text,
            fontFamily: 'Arial',
            fontSize: r.sizePt,
            fontWeight: r.bold ? 'bold' : 'normal',
          })) as any,
          style: { alignment: 'left', lineHeight: c.lineSpacing, spaceBefore: 0, spaceAfter: 0, whiteSpace: 'normal' },
        },
      ],
    };
    const r = layoutTextFrame(frame, { mode: 'office' });
    const contentW = r.content.width;
    const contentH = r.content.height;
    const textBoxH = r.textBox.height;
    const objectName = `${c.name}__c${contentH.toFixed(2)}_t${textBoxH.toFixed(2)}`;

    const text: pptxgen.TextProps[] = c.runs.map((run) => ({
      text: run.text,
      options: { fontFace: 'Arial', fontSize: run.sizePt, bold: !!run.bold, underline: { style: 'sng' } },
    }));

    slide.addText(text, {
      x: xIn,
      y: topIn,
      w: PT2IN(contentW),
      h: PT2IN(contentH),
      wrap: false,
      fit: 'none',
      valign: 'top',
      margin: 0,
      lineSpacingMultiple: c.lineSpacing,
      objectName,
      line: { color: 'FF0000', width: 1.5 }, // red outline == content box, the thing being tested
    } as pptxgen.TextPropsOptions);

    // thin blue marker at y = textBox.height — where the box would end if
    // sized by the trimmed candidate instead of content
    slide.addShape('rect', {
      x: xIn,
      y: topIn + PT2IN(textBoxH) - PT2IN(0.5),
      w: PT2IN(contentW),
      h: PT2IN(1),
      fill: { color: '0000FF' },
      line: { type: 'none' },
      objectName: `${c.name}__textBoxMarker`,
    });

    console.log(
      `  ${objectName.padEnd(38)} content ${contentW.toFixed(1)}×${contentH.toFixed(2)}pt  textBox ${textBoxH.toFixed(2)}pt  slack ${(contentH - textBoxH).toFixed(2)}pt`,
    );

    xIn += PT2IN(contentW) + gapIn; // row runs off the right edge — fine, same pattern as gen-line-spacing.ts
  }

  const out = resolve(HERE, 'arial-diagnostic.pptx');
  await p.writeFile({ fileName: out });
  console.log(`\nwrote ${out} (1 slide, ${CASES.length} cases)`);
  console.log(
    'Per case: red outline = vyaz content box (fit:none, exact size) · text underlined (baseline reference)\n' +
      '· thin blue bar = where textBox.height would end instead. Compare all three against the rendered glyphs.',
  );
}

main();
