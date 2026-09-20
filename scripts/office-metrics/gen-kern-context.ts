/**
 * gen-kern-context.ts — WHEN does PowerPoint apply a kern pair? Slide 1; slides 2–3 are the
 * wrap diagnostic (Roboto, Arial: natural / forced / fit-width boxes, see gen-wrap-diagnostic.ts).
 *
 * Known so far: in long sentences PowerPoint's width equals vyaz's kerned width (Calibri
 * 16pt, Times New Roman 20pt pairs), but two-word strings such as "Ta yo" come out WIDER
 * than vyaz's kerned width in Arial 36 / 72pt, Times New Roman 16pt and Calibri 16pt
 * (fit box wrapped). This slide varies only the context of the kern pair:
 *
 *   ox yo    control — no kern pair at all            (must be 1 line)
 *   Tayo     pair inside ONE word, no space           (1 word: wider = emergency break)
 *   Ta yo    pair at the END of a word, then a space
 *   Tax yo   pair inside a word, followed by a letter
 *   yo Ta    pair at the end of the line / paragraph
 *   AV yo    other pair, before a space
 *   AVo yo   the same pair inside a word
 *   yo AV    the same pair at the end of the line
 *
 * Every box is fit-sized: W = vyaz's default office width (kerned from 12pt on kern-table fonts,
 * 1/8pt glyph grid, + 0.01cm fit padding) + 0.06pt, so vyaz expects ONE line for all of them.
 * Without the padding this deck showed PowerPoint wider than vyaz's kerned width for the "Ta"
 * strings; with it EVERY box should stay on one line — a wrap here is still a real bug.
 * Fonts: Arial 36pt, Calibri 16pt, Times New Roman 16pt.
 *
 *   bun scripts/office-metrics/gen-kern-context.ts   → kern-context.pptx + .json
 */
import pptxgen from 'pptxgenjs';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fontMetricsProvider, layoutTextFrame } from '../../packages/core/src/index.ts';
import { addWrapDiagnosticSlides } from './gen-wrap-diagnostic.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const PT2IN = (pt: number) => pt / 72;
const round2 = (n: number) => Math.round(n * 100) / 100;

function firstExisting(paths: string[]): string {
  for (const p of paths) if (existsSync(p)) return p;
  throw new Error(`none of ${paths.join(', ')} found`);
}
const FONTS = [
  { family: 'Arial', size: 36, path: firstExisting(['/Library/Fonts/Arial.ttf', '/System/Library/Fonts/Supplemental/Arial.ttf']) },
  { family: 'Calibri', size: 16, path: firstExisting(['/Applications/Microsoft Word.app/Contents/Resources/DFonts/Calibri.ttf', '/Applications/Microsoft PowerPoint.app/Contents/Resources/DFonts/Calibri.ttf']) },
  { family: 'Times New Roman', size: 16, path: firstExisting(['/System/Library/Fonts/Supplemental/Times New Roman.ttf', '/Library/Fonts/Times New Roman.ttf']) },
];
const STRINGS = ['ox yo', 'Tayo', 'Ta yo', 'Tax yo', 'yo Ta', 'AV yo', 'AVo yo', 'yo AV'];

const widthOf = (family: string, text: string, size: number, opts: object = {}, width?: number) =>
  layoutTextFrame(
    {
      width,
      wrap: true,
      paragraphs: [{ style: { alignment: 'left', lineHeight: 1, spaceBefore: 0, spaceAfter: 0, whiteSpace: 'normal' }, children: [{ type: 'text', text, fontFamily: family, fontSize: size } as any] }],
    },
    { mode: 'office', ...opts },
  );

async function main() {
  for (const f of FONTS) await fontMetricsProvider.registerFont(f.family, { weight: 'normal', style: 'normal' }, readFileSync(f.path));
  const p = new pptxgen();
  p.defineLayout({ name: 'VYAZ_16X9', width: 13.333, height: 7.5 });
  p.layout = 'VYAZ_16X9';
  const slide = p.addSlide();
  slide.addText(
    'KERN CONTEXT — every box = vyaz width +0.06pt, vyaz expects ONE line (green). A wrapped box = PowerPoint is wider than vyaz for that string ' +
      '(kerning not applied). ox yo = no kern pair (control). Rows: Arial 36pt, Calibri 16pt, Times New Roman 16pt; 4 strings per row.',
    { x: PT2IN(12), y: PT2IN(4), w: 12.8, h: PT2IN(26), fontFace: 'Arial', fontSize: 9, bold: true, color: '222222' },
  );

  const expected: unknown[] = [];
  let yPt = 34;
  for (const f of FONTS) {
    for (let half = 0; half < 2; half++) {
      STRINGS.slice(half * 4, half * 4 + 4).forEach((text, ci) => {
        const V = widthOf(f.family, text, f.size).textBox.width;
        const kernedW = widthOf(f.family, text, f.size, { shaping: true }).textBox.width;
        const W = round2(V + 0.06);
        const lines = widthOf(f.family, text, f.size, {}, W).lines.length;
        const id = `${f.family.replace(/[^A-Z]/g, '').slice(0, 3)}${f.size}_${text.replace(/ /g, '_')}`;
        const xPt = 12 + ci * 236;
        console.log(`  ${id.padEnd(16)} W=${String(W).padStart(7)} vyaz ${lines}L  (kerned would be ${round2(kernedW)})`);
        slide.addText(`${id} · [${text}] · W ${W} · kernΔ ${round2(V - kernedW)}`, { x: PT2IN(xPt), y: PT2IN(yPt), w: PT2IN(228), h: PT2IN(11), fontFace: 'Arial', fontSize: 7.5, color: '444444', margin: 0 });
        slide.addText(text, {
          x: PT2IN(xPt), y: PT2IN(yPt + 11), w: PT2IN(W), h: PT2IN(f.size * 1.2),
          wrap: true, fit: 'none', valign: 'top', margin: 0, lineSpacingMultiple: 1, fontFace: f.family, fontSize: f.size, color: '111111',
          objectName: `${id}_W${W}`, line: { color: '00A050', width: 1.5 },
        } as pptxgen.TextPropsOptions);
        expected.push({ id, font: f.family, sizePt: f.size, text, widthPt: W, vyazWidthPt: V, kernedWidthPt: round2(kernedW), expectedLines: 1, vyazLines: lines });
      });
      yPt += 11 + f.size * 1.2 * (f.size >= 24 ? 2 : 1.7) + 6;
    }
  }
  console.log(`layout height used: ${round2(yPt)}pt of 540`);
  await addWrapDiagnosticSlides(p);
  const out = resolve(HERE, 'kern-context.pptx');
  await p.writeFile({ fileName: out });
  writeFileSync(resolve(HERE, 'kern-context.json'), JSON.stringify({ unit: 'pt', cases: expected }, null, 2));
  console.log(`wrote ${out} (3 slides: kern context, wrap diagnostic Roboto + Arial) + kern-context.json`);
}

await main();
