/**
 * gen-glyph-alphabet.ts — per-glyph advance widths as PowerPoint lays them out.
 *
 * Finding that motivated it (a PowerPoint SVG export, Roboto 72pt "To Ta", each glyph highlighted):
 * PowerPoint's glyph advances are exact multiples of 1/8 pt (T = 344/8, o = 329/8,
 * space = 143/8, a = 313/8), i.e. the font advance rounded to the nearest 1/8 pt, and
 * there was NO kerning (both T advances 43.000pt though "To" / "Ta" kern -3.5 / -4.0pt).
 * This deck checks that for whole alphabets, for Roboto and Times New Roman, at two sizes:
 *
 *   - every character is its OWN run with its OWN background (highlight) colour, a colour that is
 *     different from every other character in its line, so in the SVG export each glyph's advance is the width of one coloured
 *     rectangle (`<path d="M x0 … x1 …" fill="#RRGGBB">`);
 *   - lines: A–Z, a–z, 0–9, punctuation;
 *   - a "pairs" line: kern-heavy 2-letter words, each highlighted as ONE run, so the run
 *     width = sum of advances + any kerning inside the word (compare with the expected sum);
 *   - the same at 20pt and 11pt (1/8pt quantum independent of size?).
 *
 * Expected numbers (font advance, advance rounded to 1/8pt, kerning in vyaz's font) are
 * written to glyph-alphabet.json. Frame colour of the text boxes: Roboto red, Times New Roman green.
 *
 *   bun scripts/office-metrics/gen-glyph-alphabet.ts   → glyph-alphabet.pptx + .json
 */
import pptxgen from 'pptxgenjs';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fontMetricsProvider } from '../../packages/core/src/index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = resolve(HERE, '../../packages/core/tests/fixtures');
const PT2IN = (pt: number) => pt / 72;
const Q = 0.125;

function firstExisting(paths: string[]): string {
  for (const p of paths) if (existsSync(p)) return p;
  throw new Error(`none of ${paths.join(', ')} found`);
}
const FONTS = [
  { family: 'Roboto', path: resolve(FIX, 'Roboto-VariableFont_wdth,wght.ttf'), frame: 'FF0000' },
  { family: 'Times New Roman', path: firstExisting(['/System/Library/Fonts/Supplemental/Times New Roman.ttf', '/Library/Fonts/Times New Roman.ttf']), frame: '00A050' },
];

const LINES: { name: string; text: string }[] = [
  { name: 'upper', text: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' },
  { name: 'lower', text: 'abcdefghijklmnopqrstuvwxyz' },
  { name: 'digits', text: '0123456789' },
  { name: 'punct', text: '.,;:!?-()"\'%/&@#$+=' },
];
const PAIRS = ['To', 'Ta', 'Yo', 'Wa', 'AV', 'LT', 'Ty', 'Fl'];
/** N pairwise-different, high-contrast background colours (golden-angle hues, alternating lightness). */
function uniqueColors(n: number): string[] {
  const hsl = (h: number, sat: number, l: number) => {
    const a = sat * Math.min(l, 1 - l);
    const f = (k: number) => {
      const t = (k + h / 30) % 12;
      const c = l - a * Math.max(-1, Math.min(t - 3, 9 - t, 1));
      return Math.round(255 * c).toString(16).padStart(2, '0');
    };
    return (f(0) + f(8) + f(4)).toUpperCase();
  };
  return Array.from({ length: n }, (_, i) => hsl((i * 137.508) % 360, 1, i % 2 ? 0.62 : 0.78));
}
const COLORS = uniqueColors(40); // longer than any line below → no colour repeats within a line
// size → which lines to emit (both sizes fit on one 540pt-tall slide)
const SIZES: { size: number; lines: string[] }[] = [
  { size: 20, lines: ['upper', 'lower', 'digits', 'punct', 'pairs'] },
  { size: 11, lines: ['upper', 'lower', 'pairs'] },
];
const round2 = (n: number) => Math.round(n * 100) / 100;

async function main() {
  for (const f of FONTS) await fontMetricsProvider.registerFont(f.family, { weight: 'normal', style: 'normal' }, readFileSync(f.path));

  const p = new pptxgen();
  p.defineLayout({ name: 'VYAZ_16X9', width: 13.333, height: 7.5 });
  p.layout = 'VYAZ_16X9';
  const slide = p.addSlide();
  slide.addText(
    'GLYPH ALPHABET — every character is its own run with its own background colour; export to SVG and read each coloured rectangle as one advance. ' +
      'Roboto (red frame) vs Times New Roman (green frame), 20pt and 11pt. All colours in a line are different. Line "pairs": kern-heavy 2-letter words, ONE run each (To Ta Yo Wa AV LT Ty Fl).',
    { x: PT2IN(8), y: PT2IN(2), w: 12.9, h: PT2IN(20), fontFace: 'Arial', fontSize: 8, bold: true, color: '222222', margin: 0 },
  );

  const expected: unknown[] = [];
  let yPt = 24;
  for (const { size, lines: wanted } of SIZES) {
    for (const f of FONTS) {
      const font = fontMetricsProvider.getFont(f.family, '400', 'normal') as any;
      const raw = font._raw;
      const upm: number = font.unitsPerEm;
      const adv = (cp: number) => (raw.glyphForCodePoint(cp).advanceWidth * size) / upm;

      const lineDefs = [...LINES.map((l) => ({ ...l, kind: 'chars' as const })), { name: 'pairs', text: PAIRS.join(' '), kind: 'pairs' as const }];
      for (const ld of lineDefs.filter((l) => wanted.includes(l.name))) {
        const runs: pptxgen.TextProps[] = [];
        let colorIdx = 0;
        const rows: unknown[] = [];
        if (ld.kind === 'chars') {
          for (const ch of ld.text) {
            const a = adv(ch.codePointAt(0)!);
            runs.push({ text: ch, options: { fontFace: f.family, fontSize: size, highlight: COLORS[colorIdx++], color: '111111' } });
            rows.push({ ch, advancePt: round2(a), advance8Pt: Math.round(a / Q) * Q });
          }
        } else {
          PAIRS.forEach((w, i) => {
            const run = raw.layout(w);
            const sum8 = [...w].reduce((s, ch) => s + Math.round(adv(ch.codePointAt(0)!) / Q) * Q, 0);
            const kern = run.positions.reduce((s: number, pos: any, gi: number) => s + ((pos.xAdvance - run.glyphs[gi].advanceWidth) * size) / upm, 0);
            runs.push({ text: w, options: { fontFace: f.family, fontSize: size, highlight: COLORS[i], color: '111111' } });
            rows.push({ word: w, sumAdvance8Pt: round2(sum8), kernPt: round2(kern), kernedSum8Pt: round2(sum8 + kern) });
            if (i < PAIRS.length - 1) runs.push({ text: ' ', options: { fontFace: f.family, fontSize: size, color: '111111' } });
          });
        }
        const label = `${f.family} ${size}pt · ${ld.name}`;
        slide.addText(label, { x: PT2IN(8), y: PT2IN(yPt), w: PT2IN(300), h: PT2IN(8), fontFace: 'Arial', fontSize: 6, color: '555555', margin: 0 });
        slide.addText(runs, {
          x: PT2IN(8), y: PT2IN(yPt + 8), w: PT2IN(930), h: PT2IN(size * 1.2),
          wrap: false, fit: 'none', valign: 'top', margin: 0, lineSpacingMultiple: 1,
          objectName: `${f.family}_${size}_${ld.name}`, line: { color: f.frame, width: 0.75 },
        } as pptxgen.TextPropsOptions);
        expected.push({ font: f.family, sizePt: size, line: ld.name, unitsPerEm: upm, runs: rows });
        yPt += 8 + size * 1.2 + 2;
      }
    }
  }
  console.log(`layout height used: ${round2(yPt)}pt of 540`);

  const out = resolve(HERE, 'glyph-alphabet.pptx');
  await p.writeFile({ fileName: out });
  writeFileSync(resolve(HERE, 'glyph-alphabet.json'), JSON.stringify({ unit: 'pt', quantum: Q, expected }, null, 2));
  console.log(`wrote ${out} + glyph-alphabet.json`);
}

await main();
