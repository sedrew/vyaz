/**
 * gen-textframe-fit.ts — PowerPoint side of the fixed-rectangle round-trip.
 *
 * TS/pptxgenjs sibling of `gen-textframe-fit.py` (same two-box-per-frame
 * layout, same file name) — no Python/python-pptx needed.
 *
 * Reads `textframe-fit.json` (written by `textframe-fit-run.ts`). Per frame it
 * puts TWO TextBoxes on one slide, same text / width / font:
 *
 *   <name>       fixed at vyaz's width × content.height, wrap-only bodyPr, no
 *                autofit element — the box keeps exactly the size vyaz computed.
 *   <name>@fit   same width, height 1", "resize shape to fit text"
 *                (pptxgenjs `fit: 'resize'` → `<a:spAutoFit/>`) — PowerPoint
 *                rewrites its `cy` on save, so its height IS PowerPoint's own
 *                answer for the content height.
 *
 * Compare the two: if they match, vyaz's `content.height` is what PowerPoint would
 * use. A gap means vyaz counts the last line's trailing half-leading that
 * PowerPoint trims (or vice-versa) — see RESULTS.md "last-line trailing leading".
 *
 *   1. bun scripts/office-metrics/textframe-fit-run.ts     # vyaz -> textframe-fit.json
 *   2. bun scripts/office-metrics/gen-textframe-fit.ts      # json -> textframe-fit.pptx
 *   3. open textframe-fit.pptx, SAVE (so PowerPoint recomputes every @fit cy),
 *      then File ▸ Export ▸ SVG per slide; send back the SVGs + the saved .pptx —
 *      or, for just the @fit height (no SVG needed), run
 *      `bun scripts/office-metrics/read-powerpoint-bounds.ts textframe-fit.pptx`
 *      from a normal (non-headless) Terminal — see that file's header.
 *
 * Needs Roboto installed. 1 vyaz unit == 1 pt.
 */
import pptxgen from 'pptxgenjs';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PT2IN = (pt: number) => pt / 72;

interface FitRow {
  name: string;
  width_pt: number;
  height_pt: number;
  font_family: string;
  font_size_pt: number;
  line_spacing: number;
  text: string;
}

function addTextbox(
  slide: pptxgen.Slide,
  name: string,
  xIn: number,
  widthPt: number,
  heightPt: number,
  row: FitRow,
  fit: 'none' | 'resize',
) {
  slide.addText(row.text, {
    x: xIn,
    y: PT2IN(0.5 * 72),
    w: PT2IN(widthPt),
    h: PT2IN(heightPt),
    fontFace: row.font_family,
    fontSize: row.font_size_pt,
    lineSpacingMultiple: row.line_spacing,
    paraSpaceBefore: 0,
    paraSpaceAfter: 0,
    wrap: true,
    fit,
    valign: 'top',
    margin: 0,
    objectName: name,
    // yellow text highlight (marker behind the glyphs, <a:highlight>) — shows
    // the actual ink extent, not just the shape's box
    highlight: 'FFFF00',
  } as pptxgen.TextPropsOptions);
}

function addSlide(p: pptxgen, row: FitRow) {
  const slide = p.addSlide();
  const w = row.width_pt;
  addTextbox(slide, row.name, PT2IN(0.5 * 72), w, row.height_pt, row, 'none');
  addTextbox(slide, `${row.name}@fit`, PT2IN(0.5 * 72) + PT2IN(w) + PT2IN(36), w, 72, row, 'resize');
}

async function main() {
  const data = JSON.parse(readFileSync(resolve(HERE, 'textframe-fit.json'), 'utf8'));
  const rows: FitRow[] = data.frames;

  const p = new pptxgen();
  p.defineLayout({ name: 'VYAZ_16X9', width: 13.333, height: 7.5 });
  p.layout = 'VYAZ_16X9';
  for (const row of rows) addSlide(p, row);

  const out = resolve(HERE, 'textframe-fit.pptx');
  await p.writeFile({ fileName: out });

  console.log(`wrote ${out} (${rows.length} slides, 2 boxes each) from textframe-fit.json`);
  for (const row of rows) {
    console.log(`  ${row.name.padEnd(20)} fixed ${row.width_pt}×${row.height_pt}pt + @fit`);
  }
}

main();
