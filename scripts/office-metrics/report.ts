/**
 * report.ts — check vyaz `office` line-box metrics against real PowerPoint.
 *
 *   bun scripts/office-metrics/report.ts
 *   → prints two tables + writes scripts/office-metrics/report.md
 *
 * Oracle: `font-metrics.pptx` — groups where the author hand-fitted a rect to
 * PowerPoint's text-selection box (see parse-pptx.ts). For each sample we:
 *   1. read the measured selection-box height (rect, no insets),
 *   2. divide by the run's font size → the em-ratio PowerPoint actually uses,
 *   3. compare that ratio against the candidate formulas a JS engine could use
 *      from fontkit tables (win / hhea / typo / head), and
 *   4. run vyaz `layoutTextFrame(mode:'office')` on the same single line and
 *      print its `line.height` next to the measured value.
 *
 * Wrapped samples (many identical lines) divide by an integer line count so the
 * per-line ratio is free of the author's single-rect fitting noise.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fontMetricsProvider, layoutTextFrame, createFontFace, measurePx } from '../../packages/core/src/index.ts';
import type { TextFrame } from '../../packages/core/src/index.ts';
import { parsePptx, type Group } from './parse-pptx.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = resolve(HERE, '../../packages/core/tests/fixtures');

const FONT_FILE: Record<string, string> = {
  Roboto: 'Roboto-VariableFont_wdth,wght.ttf',
  'Great Vibes': 'GreatVibes-Regular.ttf',
};

interface RawTables {
  upm: number;
  win: number; // (winAscent + winDescent) / upm
  hhea: number; // (asc - desc + gap) / upm
  typo: number; // (typoAsc - typoDesc + typoGap) / upm
  head: number; // (yMax - yMin) / upm
  winAscentFrac: number; // winAscent / (winAscent + winDescent)
  _raw: any; // fontkit font, for width shaping
}

const raw = new Map<string, RawTables>();

/** Advance width of `text` at `sizePt`, in pt. `kern` toggles GPOS/GSUB. */
function widthPt(family: string, text: string, sizePt: number, kern: boolean): number {
  const f = raw.get(family)!._raw;
  const scale = sizePt / f.unitsPerEm;
  return measurePx(f, scale, sizePt, text, { engine: kern ? 'shape' : 'advance' });
}

async function registerFonts() {
  for (const [family, file] of Object.entries(FONT_FILE)) {
    const buf = readFileSync(resolve(FIX, file));
    await fontMetricsProvider.registerFont(family, { weight: 'normal', style: 'normal' }, buf);
    const face = await createFontFace(buf);
    const r = face._raw;
    const os2 = r['OS/2'];
    const hh = r.hhea;
    const upm = r.unitsPerEm;
    const winA = os2.winAscent;
    const winD = os2.winDescent;
    raw.set(family, {
      upm,
      win: (winA + winD) / upm,
      hhea: (hh.ascent - hh.descent + hh.lineGap) / upm,
      typo: (os2.typoAscender - os2.typoDescender + os2.typoLineGap) / upm,
      head: (r.head.yMax - r.head.yMin) / upm,
      winAscentFrac: winA / (winA + winD),
      _raw: r,
    });
  }
}

/** Single line of the group's dominant run size, laid out in office mode. */
function vyazOfficeLineHeight(family: string, sizePt: number, bold: boolean): number {
  const frame: TextFrame = {
    wrap: false,
    paragraphs: [
      {
        style: { alignment: 'left', lineHeight: 1, spaceBefore: 0, spaceAfter: 0 },
        children: [
          {
            type: 'text',
            text: 'Xg',
            fontFamily: family,
            fontSize: sizePt,
            fontWeight: bold ? 'bold' : 'normal',
            fontStyle: 'normal',
            color: '#000',
          },
        ],
      },
    ],
  };
  return layoutTextFrame(frame, { mode: 'office' }).lines[0].height;
}

const f2 = (n: number) => n.toFixed(3);
const domSize = (g: Group) => Math.max(...g.runs.map((r) => r.sizePt));

await registerFonts();
const groups = parsePptx();

// ── Table 1: single-line selection box → em ratio ──────────────────────
const single = groups.filter((g) => g.runs.length === 1 && g.name !== 'Fit');
const t1: string[] = [
  '| group | font | size,pt | measured H,pt | **measured ÷ size** | flat 1.2 | win/upm | win×1.078 (current) | hhea/upm | typo/upm | (yMax−yMin)/upm | vyaz office line.height | vyaz ÷ measured |',
  '|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|',
];
for (const g of single) {
  const r = g.runs[0];
  const R = raw.get(r.family)!;
  const ratio = g.rect.hPt / r.sizePt;
  const vy = vyazOfficeLineHeight(r.family, r.sizePt, r.bold);
  t1.push(
    `| ${g.name} | ${r.family} | ${r.sizePt} | ${g.rect.hPt.toFixed(2)} | **${f2(ratio)}** | ` +
      `1.200 | ${f2(R.win)} | ${f2(R.win * 1.078)} | ${f2(R.hhea)} | ${f2(R.typo)} | ${f2(R.head)} | ` +
      `${vy.toFixed(2)} | ${(vy / g.rect.hPt).toFixed(3)} |`,
  );
}

// ── Table 2: wrapped samples → per-line ratio (fitting-noise free) ─────
const t2: string[] = [
  '| group | font | size,pt | total H,pt | best line count | **per-line ÷ size** | note |',
  '|---|---|--:|--:|--:|--:|---|',
];
for (const g of groups.filter((x) => x.name === 'Fit' || x.name === 'Lines')) {
  const size = domSize(g);
  // assume PowerPoint's 1.2×size per line, snap to the nearest integer count
  const guessLh = 1.2 * size;
  const n = Math.max(1, Math.round(g.rect.hPt / guessLh));
  const perLine = g.rect.hPt / n / size;
  const note =
    g.name === 'Fit'
      ? '"Roboto 18px" wrapped 1 glyph/line in a ~1px column'
      : 'mixed 18/36/18pt; per-line height follows the line\'s max run';
  t2.push(`| ${g.name} | ${g.runs.map((r) => r.sizePt).join('/')} | ${size} | ${g.rect.hPt.toFixed(2)} | ${n} | **${f2(perLine)}** | ${note} |`);
}

// ── Table 3: advance width (selection box) ─────────────────────────────
const t3: string[] = [
  '| group | font | size,pt | text | measured W,pt | advance (no kern) | shape (GPOS+GSUB) | shape ÷ measured |',
  '|---|---|--:|---|--:|--:|--:|--:|',
];
for (const g of single) {
  const r = g.runs[0];
  const adv = widthPt(r.family, r.text, r.sizePt, false);
  const shp = widthPt(r.family, r.text, r.sizePt, true);
  t3.push(
    `| ${g.name} | ${r.family} | ${r.sizePt} | ${JSON.stringify(r.text)} | ${g.rect.wPt.toFixed(2)} | ` +
      `${adv.toFixed(2)} | ${shp.toFixed(2)} | ${(shp / g.rect.wPt).toFixed(3)} |`,
  );
}

const md =
  [
    '# Office (PowerPoint / DrawingML) line-box calibration',
    '',
    'Oracle: `font-metrics.pptx`. Rects are hand-fitted to the text-selection box',
    '(no insets). `measured ÷ size` is the baseline-to-baseline em ratio PowerPoint',
    'uses at 100% line spacing.',
    '',
    '## 1. Single-line selection box',
    '',
    ...t1,
    '',
    '## 2. Wrapped samples (per-line, fitting-noise removed)',
    '',
    ...t2,
    '',
    '## 3. Advance width vs the selection box',
    '',
    ...t3,
    '',
    '## Reading',
    '',
    '- PowerPoint\'s line box is **≈ 1.20 × font size, font-independent** — Great',
    '  Vibes (win ratio ' + f2(raw.get('Great Vibes')!.win) + ') gets the *same* ~1.2× box as Roboto,',
    '  and the 10-line "Fit" stack (no single-rect fitting noise) lands on 1.201.',
    '- No single fontkit table field gives ~1.2 for both fonts:',
    '  Roboto win/upm=' + f2(raw.get('Roboto')!.win) + ' (✓ by luck), hhea/upm=' + f2(raw.get('Roboto')!.hhea) +
      ', typo/upm=' + f2(raw.get('Roboto')!.typo) + ';',
    '  Great Vibes win/upm=' + f2(raw.get('Great Vibes')!.win) + ' (✗), hhea/upm=' + f2(raw.get('Great Vibes')!.hhea) +
      ', typo/upm=' + f2(raw.get('Great Vibes')!.typo) + '.',
    '  "Well-behaved" webfonts set winAscent+winDescent ≈ 1.2em by design, which is',
    '  why the current code accidentally works on Roboto/Inter.',
    '- The current `winAscent/winDescent × 1.078` path overshoots ~6% on Roboto and',
    '  ~55% on Great Vibes.',
    '',
    '### Candidate models (both fit this data; need a big-hhea display font to split)',
    '',
    '- **A — flat:** `line = lnSpcPct/100 × 1.2 × maxRunSizePt`. Matches the noise-free',
    '  wrapped samples (1.201 / 1.205).',
    '- **B — clamped:** `line = lnSpcPct/100 × max(1.2, (hheaAsc−hheaDesc+hheaGap)/upm) × maxRunSizePt`.',
    '  Great Vibes → 1.252 (measured 1.215, +3%, within hand-fit noise).',
    '',
    'Split the box into ascent/descent for baseline placement with',
    '`winAscent ÷ (winAscent + winDescent)` (≈ ' + f2(raw.get('Roboto')!.winAscentFrac) + ' for Roboto). Also honour',
    '`<a:spcPts>` (exact points, no font involvement) — currently only the multiplier is.',
    '',
    '### Width is already correct',
    '',
    '- `shape` (fontkit `layout()`, GPOS+GSUB) matches PowerPoint\'s selection-box',
    '  width to **±0.4%** here — inside the hand-fitting noise. Plain advance-sum is',
    '  within ~0.5% on these low-kern strings.',
    '- Advances come from `hmtx` + `GPOS`, which fontkit and PowerPoint',
    '  (DirectWrite) read identically — no undocumented factor, unlike height.',
    '- Advance widths are **identical in `office` and `browser`** modes; only',
    '  ascent/descent differ. The only width knobs: use `shaping:true` for kern-pair',
    '  parity (see `scripts/browser-metrics`), and map `<a:rPr spc>` → letterSpacing.',
    '',
  ].join('\n') + '\n';

writeFileSync(resolve(HERE, 'report.md'), md);
console.log(md);
