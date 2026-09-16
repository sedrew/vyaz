/**
 * gen-line-spacing.ts — build the line-spacing oracle deck for office-metrics.
 *
 * TS/pptxgenjs sibling of `gen-line-spacing.py` (same shapes, same geometry,
 * same file name) — no Python/python-pptx needed. Keep both: this one needs
 * only `bun`, the .py one is the original reference if a pptxgenjs quirk is
 * ever suspected.
 *
 * Isolates the paragraph line-spacing multiplier (`<a:lnSpc><a:spcPct>`, i.e.
 * `style.lineHeight` in vyaz) in `mode: 'office'`.
 *
 * Slide 1, five **plain TextBoxes** laid left-to-right (Roboto) — no groups,
 * no marker rects. The row runs past the right slide edge; that is fine,
 * PowerPoint keeps off-slide shapes and exports them:
 *
 *     ls-100      one paragraph, line spacing 1.0, wrapped
 *     ls-150      same text/width, line spacing 1.5
 *     ls-200      same text/width, line spacing 2.0
 *     ls-stacked  one box, three paragraphs (1.0 / 1.5 / 2.0), space before/after 0
 *     ls-mixed    one paragraph, runs 18 / 36 / 18 pt, line spacing 1.5
 *
 * Slide 2: the same five cases again, suffixed `-arial` (`ls-100-arial`, …),
 * set in Arial instead of Roboto. The 1.20 / 0.75 office line-box constants
 * (RESULTS.md) were only ever checked empirically against Roboto + Great
 * Vibes — but Arial is vyaz's own *default* `fontFamily` (`DEFAULT_TEXT_STYLE`
 * in `packages/core/src/types/Document.ts`) and the font the *old*, replaced
 * formula was fitted to (see this directory's README, "Environment"). Slide 2
 * is the sanity check that the new model still holds for it.
 *
 * Each box is fixed-width, word-wrap on, "resize shape to fit text"
 * (pptxgenjs `fit: 'resize'` → `<a:spAutoFit/>`) — PowerPoint does the
 * wrapping and grows the height. Slide 1 mirrors the vyaz golden corpus in
 * `packages/renderers/tests/office-cases/line-spacing-*` (same text, width,
 * font, line-spacing) so the export and the golden compare directly.
 *
 * Workflow:
 *   1. bun scripts/office-metrics/gen-line-spacing.ts
 *   2. open line-spacing.pptx in PowerPoint, let it re-wrap, save.
 *   3. per box: select it, File ▸ Export ▸ SVG (selection) → office-cases/<case>/powerpoint.svg
 *      (slide-1 box order above; don't swap stacked / mixed — slide-2 boxes
 *      are extra Arial cases, not part of the office-cases golden corpus).
 *
 * Needs: Roboto + Arial installed so PowerPoint wraps them the way the
 * goldens / vyaz expect. Arial ships with every real Mac/Windows PowerPoint;
 * if this machine happens to lack it, slide 2 will just wrap however
 * PowerPoint's Arial-not-found substitute font does — still useful signal,
 * just say which font it actually used when reporting back.
 * (No python-pptx / Python needed — pptxgenjs is a devDependency of the repo.)
 */
import pptxgen from 'pptxgenjs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

const SIZE_PT = 18;

// vyaz layout is unit-agnostic; the office-cases goldens use `width` / `fontSize`
// in the *same* unit. Treat 1 vyaz unit = 1 pt (DrawingML's native unit) so the
// deck wraps at the same points as the goldens: box width in pt = golden `width`,
// run size in pt = golden `fontSize`.
const PT2IN = (pt: number) => pt / 72;

interface Run {
  text: string;
  sizePt: number;
}

interface Sample {
  name: string;
  boxWidthPt: number;
  /** paragraphs, each a run list */
  paragraphs: Run[][];
  /** line-spacing multiplier per paragraph (`<a:spcPct>`) */
  spacings: number[];
}

/** Same five cases for any `family` — `nameSuffix` keeps slide-2 (Arial) names distinct. */
function buildSamples(family: string, nameSuffix: string): Sample[] {
  const wrapText = `${family} office line spacing sample text that wraps onto several lines here`;
  return [
    { name: `ls-100${nameSuffix}`, boxWidthPt: 200, paragraphs: [[{ text: wrapText, sizePt: SIZE_PT }]], spacings: [1.0] },
    { name: `ls-150${nameSuffix}`, boxWidthPt: 200, paragraphs: [[{ text: wrapText, sizePt: SIZE_PT }]], spacings: [1.5] },
    { name: `ls-200${nameSuffix}`, boxWidthPt: 200, paragraphs: [[{ text: wrapText, sizePt: SIZE_PT }]], spacings: [2.0] },
    {
      name: `ls-stacked${nameSuffix}`,
      boxWidthPt: 200,
      paragraphs: [[{ text: wrapText, sizePt: SIZE_PT }], [{ text: wrapText, sizePt: SIZE_PT }], [{ text: wrapText, sizePt: SIZE_PT }]],
      spacings: [1.0, 1.5, 2.0],
    },
    {
      name: `ls-mixed${nameSuffix}`,
      boxWidthPt: 260,
      paragraphs: [
        [
          { text: 'small before ', sizePt: 18 },
          { text: 'BIG MIDDLE', sizePt: 36 },
          { text: ' small after wraps here', sizePt: 18 },
        ],
      ],
      spacings: [1.5],
    },
  ];
}

function addSample(slide: pptxgen.Slide, sample: Sample, xIn: number, family: string) {
  const text: pptxgen.TextProps[] = [];
  sample.paragraphs.forEach((runs, pi) => {
    const lineSpacingMultiple = sample.spacings[pi];
    runs.forEach((r, ri) => {
      const isLastRunInParagraph = ri === runs.length - 1;
      text.push({
        text: r.text,
        options: {
          fontFace: family,
          fontSize: r.sizePt,
          lineSpacingMultiple,
          paraSpaceBefore: 0,
          paraSpaceAfter: 0,
          // pptxgenjs groups runs into one <a:p> up to (and including) the
          // run whose options carry breakLine:true.
          breakLine: isLastRunInParagraph,
          // yellow text highlight (marker behind the glyphs, <a:highlight>) —
          // tighter than a shape fill, shows the actual ink, not just the box
          highlight: 'FFFF00',
        },
      });
    });
  });

  slide.addText(text, {
    x: xIn,
    y: PT2IN(0.4 * 72), // matches python's Inches(0.4)
    w: PT2IN(sample.boxWidthPt),
    h: 1, // 1in seed box; fit:'resize' grows it
    fontFace: family,
    fontSize: SIZE_PT,
    wrap: true,
    fit: 'resize',
    valign: 'top',
    margin: 0,
    objectName: sample.name,
  } as pptxgen.TextPropsOptions);
}

function addRow(slide: pptxgen.Slide, samples: Sample[], family: string) {
  let xIn = PT2IN(0.4 * 72);
  const gapIn = PT2IN(24);
  for (const sample of samples) {
    addSample(slide, sample, xIn, family);
    xIn += PT2IN(sample.boxWidthPt) + gapIn; // row runs off the right edge — fine
  }
}

async function main() {
  const p = new pptxgen();
  p.defineLayout({ name: 'VYAZ_16X9', width: 13.333, height: 7.5 });
  p.layout = 'VYAZ_16X9';

  const robotoSamples = buildSamples('Roboto', '');
  addRow(p.addSlide(), robotoSamples, 'Roboto');

  const arialSamples = buildSamples('Arial', '-arial');
  addRow(p.addSlide(), arialSamples, 'Arial');

  const out = resolve(HERE, 'line-spacing.pptx');
  await p.writeFile({ fileName: out });
  console.log(`wrote ${out} (2 slides — Roboto, Arial — ${robotoSamples.length} TextBoxes each)`);
}

main();
