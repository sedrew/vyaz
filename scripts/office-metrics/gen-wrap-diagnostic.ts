/**
 * gen-wrap-diagnostic.ts — does PowerPoint wrap text at the same points vyaz
 * does? RESULTS.md "still open" #1 flags exactly this ("PowerPoint word-wraps
 * a large run more eagerly than vyaz: 5 lines vs 3") — this deck is built to
 * chase it down properly instead of on one anecdotal case.
 *
 * One slide per font (Roboto, Arial), cases split into **2 columns** (so the
 * slide doesn't grow into one very tall column — `narrow` alone is 20 lines).
 * Per case, **three boxes side by side**, same text content:
 *
 *   <case>-natural (yellow highlight) — the text as ONE flowing string, box
 *     width = the case's declared column (`c.widthPt`), `wrap:true` —
 *     PowerPoint's own word-wrap engine decides the line breaks.
 *   <case>-forced (green highlight) — the SAME text, but split into vyaz's
 *     own chosen lines for that column (`layoutTextFrame(...).lines[].spans[]`,
 *     per-run formatting kept), each line forced with `breakLine:true` —
 *     PowerPoint cannot re-wrap a forced break, so this box always shows
 *     *exactly* vyaz's own wrap decision, whatever it is.
 *   <case>-fitwidth (orange highlight) — the same flowing text as `-natural`,
 *     `wrap:true`, but the box width is `content.width` (the widest line
 *     vyaz's own wrap already produced) instead of the declared column — no
 *     slack at all. This is deliberately the same shape as a bug the
 *     generator itself had (box sized to `content.width` by mistake, which
 *     silently gave PowerPoint a narrower box than intended and it correctly
 *     wrapped inside it) — worth keeping as its own case, since a real
 *     "shape sized to fit its text" box is exactly this scenario.
 *
 * All three boxes are fixed-size (`fit:'none'`), height = vyaz's own
 * predicted `content.height`, with a **red outline** — so if PowerPoint's
 * wrap picks MORE lines than vyaz did, the overflow is visible spilling past
 * the red frame, not just a line-count mismatch you'd have to count by hand.
 * If natural/forced/fitwidth all wrap to the same lines, all three boxes
 * should look near-identical (same words per line); if they don't, the
 * mismatch is immediately visible as different line breaks between colors.
 *
 *   bun scripts/office-metrics/gen-wrap-diagnostic.ts
 *   → wrap-diagnostic.pptx (2 slides: Roboto, Arial)
 */
import pptxgen from 'pptxgenjs';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fontMetricsProvider, layoutTextFrame } from '../../packages/core/src/index.ts';
import type { TextFrame } from '../../packages/core/src/index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = resolve(HERE, '../../packages/core/tests/fixtures');
const PT2IN = (pt: number) => pt / 72;

function firstExisting(paths: string[]): string {
  for (const p of paths) if (existsSync(p)) return p;
  throw new Error(`none of ${paths.join(', ')} found`);
}
const FONTS: Record<string, string> = {
  Roboto: resolve(FIX, 'Roboto-VariableFont_wdth,wght.ttf'),
  Arial: firstExisting(['/Library/Fonts/Arial.ttf', '/System/Library/Fonts/Supplemental/Arial.ttf']),
};

const PARAGRAPH =
  'The quick brown fox jumps over the lazy dog while a TextFrame measures ' +
  'every line box and decides where each word wraps inside the given ' +
  'rectangle, with no autofit shrinking the text to make it fit.'; // same text as textframe-fit-run.ts, for cross-reference

interface Run {
  text: string;
  sizePt: number;
}
interface Case {
  name: string;
  widthPt: number;
  runs: Run[];
}

const CASES: Case[] = [
  { name: 'short', widthPt: 200, runs: [{ text: 'Short line here.', sizePt: 18 }] },
  { name: 'two-line', widthPt: 200, runs: [{ text: 'This text wraps onto two lines exactly.', sizePt: 18 }] },
  { name: 'paragraph', widthPt: 200, runs: [{ text: PARAGRAPH, sizePt: 18 }] },
  { name: 'narrow', widthPt: 100, runs: [{ text: PARAGRAPH, sizePt: 18 }] }, // same text, half the column
  {
    name: 'long-word',
    widthPt: 200,
    runs: [
      {
        text: 'Check this URL: https://example.com/a/very/long/path/that/does/not/have/any/spaces/in/it/at/all and then continue normally after it.',
        sizePt: 18,
      },
    ],
  },
  {
    // exact reproduction of RESULTS.md's "5 lines vs 3" open case
    name: 'mixed-run',
    widthPt: 260,
    runs: [
      { text: 'small before ', sizePt: 18 },
      { text: 'BIG MIDDLE', sizePt: 36 },
      { text: ' small after wraps here', sizePt: 18 },
    ],
  },
  { name: 'size-12', widthPt: 200, runs: [{ text: PARAGRAPH, sizePt: 12 }] },
  { name: 'size-24', widthPt: 200, runs: [{ text: PARAGRAPH, sizePt: 24 }] },
];

const round2 = (n: number) => Math.round(n * 100) / 100;

function layoutCase(family: string, c: Case) {
  const frame: TextFrame = {
    width: c.widthPt,
    wrap: true,
    paragraphs: [
      {
        children: c.runs.map((r) => ({ type: 'text', text: r.text, fontFamily: family, fontSize: r.sizePt })) as any,
        style: { alignment: 'left', lineHeight: 1, spaceBefore: 0, spaceAfter: 0, whiteSpace: 'normal' },
      },
    ],
  };
  return layoutTextFrame(frame, { mode: 'office' });
}

async function main() {
  for (const [name, path] of Object.entries(FONTS)) {
    await fontMetricsProvider.registerFont(name, { weight: 'normal', style: 'normal' }, readFileSync(path));
  }

  const p = new pptxgen();
  p.defineLayout({ name: 'VYAZ_16X9', width: 13.333, height: 7.5 });
  p.layout = 'VYAZ_16X9';

  const xStartIn = PT2IN(0.4 * 72);
  const boxGapPt = 24; // gap between the 3 boxes in a row
  const rowGapIn = PT2IN(16);

  // 2 columns of cases (first half / second half), so the slide doesn't grow
  // into one very tall single column. Column pitch sized off the widest case
  // (mixed-run, 260pt) × 3 boxes, so no case's row can spill into column 2.
  const maxCaseWidthPt = Math.max(...CASES.map((c) => c.widthPt));
  const colPitchIn = PT2IN(3 * maxCaseWidthPt + 2 * boxGapPt + 60); // +60pt gutter between columns
  const half = Math.ceil(CASES.length / 2);
  const columns = [CASES.slice(0, half), CASES.slice(half)];

  for (const [family] of Object.entries(FONTS)) {
    const slide = p.addSlide();
    slide.addText(family, { x: xStartIn, y: PT2IN(6), w: 6, h: PT2IN(24), fontFace: 'Arial', fontSize: 14, bold: true });

    console.log(`\n${family}:`);
    columns.forEach((colCases, colIdx) => {
      const colXIn = xStartIn + colIdx * colPitchIn;
      let yIn = PT2IN(0.4 * 72) + PT2IN(28);

      for (const c of colCases) {
        const r = layoutCase(family, c);
        // NB: box width must be the column width we asked vyaz to wrap against
        // (c.widthPt), not r.content.width — content.width is the width of the
        // *longest rendered line*, which for short text is much narrower than
        // the column. Sizing the PowerPoint box to content.width silently gave
        // PowerPoint a narrower box than intended and it (correctly!) wrapped
        // inside that accidentally-narrow box — not a vyaz wrap bug. Kept on
        // purpose as its own case below ("fit-width") — a box exactly as wide
        // as the text needs is a real scenario (shape "fit to text" on width),
        // and it's worth seeing whether PowerPoint still wraps inside it.
        const contentW = r.content.width;
        const contentH = r.content.height;
        const lineTexts = r.lines.map((l) => l.spans.map((s) => s.text).join(''));
        console.log(`  ${c.name.padEnd(10)} ${c.widthPt}pt  ${r.lines.length} lines: ${JSON.stringify(lineTexts)}`);

        // case label, plain text, above the row
        slide.addText(`${c.name}  (${c.widthPt}pt, ${r.lines.length} lines)`, {
          x: colXIn,
          y: yIn,
          w: 6,
          h: PT2IN(14),
          fontFace: 'Arial',
          fontSize: 9,
          color: '444444',
        });
        const rowTopIn = yIn + PT2IN(16);

        // box A — natural: one flowing run list, PowerPoint's own word-wrap
        const naturalText: pptxgen.TextProps[] = c.runs.map((run) => ({
          text: run.text,
          options: { fontFace: family, fontSize: run.sizePt },
        }));
        const naturalName = `${family}_${c.name}_natural__lines${r.lines.length}`;
        slide.addText(naturalText, {
          x: colXIn,
          y: rowTopIn,
          w: PT2IN(c.widthPt),
          h: PT2IN(contentH),
          wrap: true,
          fit: 'none',
          valign: 'top',
          margin: 0,
          lineSpacingMultiple: 1,
          underline: { style: 'sng' },
          highlight: 'FFFF00',
          objectName: naturalName,
          line: { color: 'FF0000', width: 1 },
        } as pptxgen.TextPropsOptions);

        // box B — forced: vyaz's own line breaks, one pptxgenjs paragraph per
        // vyaz line (breakLine:true), per-span font size/family kept — cannot
        // be re-wrapped by PowerPoint, always shows vyaz's exact decision
        const forcedText: pptxgen.TextProps[] = [];
        for (const line of r.lines) {
          line.spans.forEach((s, i) => {
            forcedText.push({
              text: s.text,
              options: {
                fontFace: s.style.fontFamily,
                fontSize: s.style.fontSize,
                breakLine: i === line.spans.length - 1,
              },
            });
          });
        }
        const forcedName = `${family}_${c.name}_forced__lines${r.lines.length}`;
        const forcedXIn = colXIn + PT2IN(c.widthPt + boxGapPt);
        slide.addText(forcedText, {
          x: forcedXIn,
          y: rowTopIn,
          w: PT2IN(c.widthPt),
          h: PT2IN(contentH),
          wrap: false,
          fit: 'none',
          valign: 'top',
          margin: 0,
          lineSpacingMultiple: 1,
          underline: { style: 'sng' },
          highlight: '00FF00',
          objectName: forcedName,
          line: { color: 'FF0000', width: 1 },
        } as pptxgen.TextPropsOptions);

        // box C — fit-width: same flowing text as box A, but the box is only
        // as wide as vyaz's own content.width (the widest already-wrapped
        // line) instead of the full column — the accidental case that found
        // the bug above, now on purpose. If PowerPoint still wraps inside
        // this (no slack at all), that's real, not a generator bug.
        const fitText: pptxgen.TextProps[] = c.runs.map((run) => ({
          text: run.text,
          options: { fontFace: family, fontSize: run.sizePt },
        }));
        const fitName = `${family}_${c.name}_fitwidth__lines${r.lines.length}`;
        const fitXIn = colXIn + 2 * PT2IN(c.widthPt + boxGapPt);
        slide.addText(fitText, {
          x: fitXIn,
          y: rowTopIn,
          w: PT2IN(contentW),
          h: PT2IN(contentH),
          wrap: true,
          fit: 'none',
          valign: 'top',
          margin: 0,
          lineSpacingMultiple: 1,
          underline: { style: 'sng' },
          highlight: 'FFA500',
          objectName: fitName,
          line: { color: 'FF0000', width: 1 },
        } as pptxgen.TextPropsOptions);

        yIn = rowTopIn + PT2IN(contentH) + rowGapIn;
      }
    });
  }

  const out = resolve(HERE, 'wrap-diagnostic.pptx');
  await p.writeFile({ fileName: out });
  console.log(`\nwrote ${out} (2 slides: ${Object.keys(FONTS).join(', ')}; yellow=PowerPoint natural wrap, green=vyaz forced wrap)`);
}

main();
