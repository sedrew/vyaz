/**
 * gen-font-grid-diagnostic.ts — one slide per font, full size × line-spacing
 * grid, to stress-test the `typoAscFrac`-based `OFFICE_BASELINE_RATIO` fix
 * (PositioningEngine.ts) across fonts with genuinely different OS/2 ratios:
 *
 *   Roboto           typoAscFrac 0.7500  (upm 2048 — the flat constant's origin)
 *   Arial            typoAscFrac 0.7758  (upm 2048 — where the fix started)
 *   Unifont          typoAscFrac 0.8750  (upm   64 — tiny grid, huge outlier)
 *   Times New Roman  typoAscFrac 0.7626  (upm 2048 — serif, different again)
 *
 * One slide per font. Per slide, a **grid**:
 *   rows    = font size, 6 → 70pt (11 steps: 6/8/10/12/14/18/24/32/40/56/70)
 *   columns = line-spacing multiplier (`<a:spcPct>`), 100/125/150/175/200%
 *
 * Each cell is one unwrapped line reading its own size (`"18pt"`) — compact,
 * self-labelling, keeps every column in a row the same width (line-spacing
 * doesn't affect glyph advances, only height, so content.width is identical
 * across a row's 5 cells). Column pitch is fixed per font at the 70pt row's
 * width, so cells line up into a real grid rather than each row hugging its
 * own text.
 *
 * Same visual language as gen-arial-diagnostic.ts: red outline = vyaz
 * `content` box (fit:'none', exact size), text underlined (baseline
 * reference), thin blue bar at `textBox.height`.
 *
 * ⚠ Rows run tall — the full 11-row grid is ~760pt, well past one slide's
 * 540pt (7.5in) height. That's fine, PowerPoint keeps and exports off-slide
 * shapes (same as gen-line-spacing.ts's off-right rows) — export the whole
 * slide, not just the visible area, or select-and-export per row/cell.
 *
 *   bun scripts/office-metrics/gen-font-grid-diagnostic.ts
 *   → font-grid-diagnostic.pptx (4 slides: Roboto, Arial, Unifont, Times New Roman)
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

const SIZES = [6, 8, 10, 12, 14, 18, 24, 32, 40, 56, 70];
const SPACINGS = [1.0, 1.25, 1.5, 1.75, 2.0];

interface FontDef {
  name: string;
  path: string;
}

const FONTS: FontDef[] = [
  { name: 'Roboto', path: resolve(FIX, 'Roboto-VariableFont_wdth,wght.ttf') },
  { name: 'Arial', path: firstExisting(['/Library/Fonts/Arial.ttf', '/System/Library/Fonts/Supplemental/Arial.ttf']) },
  { name: 'Unifont', path: resolve(FIX, 'unifont-17.0.05.otf') },
  {
    name: 'Times New Roman',
    path: firstExisting([
      '/Library/Fonts/Times New Roman.ttf',
      '/System/Library/Fonts/Supplemental/Times New Roman.ttf',
    ]),
  },
];

function firstExisting(paths: string[]): string {
  for (const p of paths) if (existsSync(p)) return p;
  throw new Error(`none of ${paths.join(', ')} found`);
}

/** vyaz office-mode layout for one unwrapped line. */
function layoutCell(family: string, text: string, sizePt: number, lineSpacing: number) {
  const frame: TextFrame = {
    wrap: false,
    paragraphs: [
      {
        children: [{ type: 'text', text, fontFamily: family, fontSize: sizePt } as any],
        style: { alignment: 'left', lineHeight: lineSpacing, spaceBefore: 0, spaceAfter: 0, whiteSpace: 'normal' },
      },
    ],
  };
  return layoutTextFrame(frame, { mode: 'office' });
}

async function main() {
  for (const f of FONTS) {
    await fontMetricsProvider.registerFont(f.name, { weight: 'normal', style: 'normal' }, readFileSync(f.path));
  }

  const p = new pptxgen();
  p.defineLayout({ name: 'VYAZ_16X9', width: 13.333, height: 7.5 });
  p.layout = 'VYAZ_16X9';

  const xStartIn = PT2IN(0.4 * 72);
  const yStartIn = PT2IN(0.4 * 72);
  const colGapIn = PT2IN(16);
  const rowGapIn = PT2IN(8);

  for (const f of FONTS) {
    const slide = p.addSlide();
    slide.addText(f.name, { x: xStartIn, y: PT2IN(6), w: 6, h: PT2IN(24), fontFace: 'Arial', fontSize: 14, bold: true });

    // fixed column pitch for this font: width of the 70pt row's cell (the
    // widest label), same for every row so columns actually line up
    const widestRow = layoutCell(f.name, `${SIZES[SIZES.length - 1]}pt`, SIZES[SIZES.length - 1], 1.0);
    const colPitchIn = PT2IN(widestRow.content.width) + colGapIn;

    let yIn = yStartIn + PT2IN(28); // room for the font-name label above row 1
    let printed = 0;
    for (const size of SIZES) {
      // row height = tallest cell in the row = largest spacing (content.height
      // scales linearly with lineHeight; 2.0 is always the tallest column)
      const tallest = layoutCell(f.name, `${size}pt`, size, SPACINGS[SPACINGS.length - 1]);
      const rowHeightIn = PT2IN(tallest.content.height);

      let xIn = xStartIn;
      for (const spacing of SPACINGS) {
        const text = `${size}pt`;
        const r = layoutCell(f.name, text, size, spacing);
        const contentW = r.content.width;
        const contentH = r.content.height;
        const textBoxH = r.textBox.height;
        const objectName = `${f.name.replace(/\s+/g, '')}_${size}pt_sp${String(spacing).replace(/\.0$/, '').replace('.', '_')}__c${contentH.toFixed(2)}_t${textBoxH.toFixed(2)}`;

        slide.addText(text, {
          x: xIn,
          y: yIn,
          w: PT2IN(contentW),
          h: PT2IN(contentH),
          fontFace: f.name,
          fontSize: size,
          lineSpacingMultiple: spacing,
          wrap: false,
          fit: 'none',
          valign: 'top',
          margin: 0,
          underline: { style: 'sng' },
          highlight: 'FFFF00',
          objectName,
          line: { color: 'FF0000', width: 1 },
        } as pptxgen.TextPropsOptions);

        slide.addShape('rect', {
          x: xIn,
          y: yIn + PT2IN(textBoxH) - PT2IN(0.5),
          w: PT2IN(contentW),
          h: PT2IN(1),
          fill: { color: '0000FF' },
          line: { type: 'none' },
          objectName: `${objectName}__textBoxMarker`,
        });

        xIn += colPitchIn;
        printed++;
      }
      yIn += rowHeightIn + rowGapIn;
    }
    console.log(`${f.name}: ${printed} cells (${SIZES.length} sizes × ${SPACINGS.length} spacings)`);
  }

  const out = resolve(HERE, 'font-grid-diagnostic.pptx');
  await p.writeFile({ fileName: out });
  console.log(`\nwrote ${out} (${FONTS.length} slides: ${FONTS.map((f) => f.name).join(', ')})`);
}

main();
