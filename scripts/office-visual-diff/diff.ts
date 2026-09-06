/**
 * diff.ts — join vyaz `office` geometry with what PowerPoint actually painted.
 *
 *   bun scripts/office-visual-diff/diff.ts
 *
 * `SHAPE_TO_FIT_TEXT` is a no-op on export, so we do NOT trust the box border.
 * measure-ref.ts gives:
 *   inkWpt / inkHpt   — painted glyph bounding box (tighter than the line box)
 *   nBands            — horizontal ink rows ≈ line count
 *   lineAdvancePt     — median band-top → band-top gap (only meaningful nBands≥2)
 *
 * Compared to vyaz:
 *   content.width     ≈ inkWpt         (advance — should match to <1%)
 *   median line.height vs lineAdvancePt (the office line-box — the real signal)
 *   line.height / domFontPt            (em-ratio: ~1.20 PowerPoint / 1.078·win today)
 *
 * Writes report.md + __diffs__/<slug>.{png,md}. Measurement only, no pass/fail.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  HERE, OURS_DIR, REFS_DIR, DIFFS_DIR, readPng, writePng, crop, triptych,
} from './lib.ts';

interface Ours {
  name: string; nLines: number; contentWpt: number; contentHpt: number; domFontPt: number;
  lines: { i: number; h: number; ascent: number; descent: number }[];
}
interface Ref {
  slug: string; pxPerPt: number; inkWpt: number; inkHpt: number;
  nBands: number; lineAdvancePt: number;
  inkBBoxPx: { x: number; y: number; w: number; h: number };
}

const oursBySlug = new Map<string, Ours>();
for (const f of readdirSync(OURS_DIR).filter((f) => f.endsWith('.json')))
  oursBySlug.set(f.replace(/\.json$/, ''), JSON.parse(readFileSync(resolve(OURS_DIR, f), 'utf8')));

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[s.length >> 1];
};

interface Row {
  slug: string; name: string; font: string; dom: number;
  nOur: number; nBand: number;
  refInkW: number; ourW: number; dW: number;
  refAdv: number; ourLh: number; dLh: number;
  refEm: number; ourEm: number;
}
const rows: Row[] = [];

for (const f of readdirSync(REFS_DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_'))) {
  const ref: Ref = JSON.parse(readFileSync(resolve(REFS_DIR, f), 'utf8'));
  const ours = oursBySlug.get(ref.slug);
  if (!ours) { console.warn(`  – ${ref.slug}: no ours/`); continue; }

  const ourLh = median(ours.lines.map((l) => l.h));
  const dW = ((ours.contentWpt - ref.inkWpt) / ref.inkWpt) * 100;
  const advUsable = ref.nBands >= 2;
  const dLh = advUsable ? ((ourLh - ref.lineAdvancePt) / ref.lineAdvancePt) * 100 : NaN;

  let font = '';
  try {
    const input = JSON.parse(readFileSync(resolve(HERE, '../../packages/renderers/tests/cases', ours.name, 'input.json'), 'utf8'));
    const fams = input.frame.paragraphs.flatMap((p: any) => (p.children ?? []).map((r: any) => {
      const ff = r.fontFamily ?? input.frame.defaultStyle?.fontFamily ?? 'Arial';
      return Array.isArray(ff) ? ff[0] : ff;
    }));
    font = [...new Set(fams)].join('/').slice(0, 20);
  } catch { /* */ }

  rows.push({
    slug: ref.slug, name: ours.name, font, dom: ours.domFontPt,
    nOur: ours.nLines, nBand: ref.nBands,
    refInkW: ref.inkWpt, ourW: ours.contentWpt, dW,
    refAdv: ref.lineAdvancePt, ourLh, dLh,
    refEm: advUsable ? ref.lineAdvancePt / ours.domFontPt : NaN,
    ourEm: ourLh / ours.domFontPt,
  });

  try {
    const refPng = readPng(resolve(REFS_DIR, `${ref.slug}.png`));
    const ourPng = readPng(resolve(OURS_DIR, `${ref.slug}.png`));
    const pad = 6;
    const b = ref.inkBBoxPx;
    writePng(
      resolve(DIFFS_DIR, `${ref.slug}.png`),
      triptych(crop(refPng, { x: b.x - pad, y: b.y - pad, w: b.w + 2 * pad, h: b.h + 2 * pad }), ourPng),
    );
  } catch (e) { console.warn(`  – ${ref.slug}: image ${e}`); }
}

rows.sort((a, b) => (isNaN(b.dLh) ? -1 : isNaN(a.dLh) ? 1 : Math.abs(b.dLh) - Math.abs(a.dLh)));

const f1 = (n: number) => (isNaN(n) ? '  —' : (n >= 0 ? '+' : '') + n.toFixed(1) + '%');
const f3 = (n: number) => (isNaN(n) ? '  —' : n.toFixed(3));

const md = [
  `# office parity — vyaz \`mode:'office'\` vs PowerPoint (painted ink)`,
  ``,
  `${rows.length} cases. The reference box \`auto_size\` did **not** re-fit on`,
  `export, so this compares PAINTED INK, not the box border:`,
  ``,
  `- **W** — vyaz \`content.width\` vs the ink bbox width (advance). Expect <1%.`,
  `- **line adv** — vyaz median \`line.height\` vs PowerPoint's band-to-band gap.`,
  `  Only meaningful when the case wrapped to ≥2 lines (\`nBand\` ≥ 2); single-line`,
  `  cases show \`—\` (need the line-probe pass for those).`,
  `- **em** — line advance ÷ dominant font pt. PowerPoint ≈ 1.20 (font-independent);`,
  `  \`office\` today = \`winAscent/winDescent × 1.078\`.`,
  ``,
  `| case | font | pt | nLine v/p | W vyaz/ref | ΔW | line-adv vyaz/ref | Δ | em vyaz/ref |`,
  `|---|---|--:|:--:|--:|--:|--:|--:|--:|`,
  ...rows.map((r) =>
    `| ${r.name} | ${r.font} | ${r.dom} | ${r.nOur}/${r.nBand} | ` +
    `${r.ourW.toFixed(0)}/${r.refInkW.toFixed(0)} | ${f1(r.dW)} | ` +
    `${r.ourLh.toFixed(1)}/${isNaN(r.refAdv) || r.nBand < 2 ? '—' : r.refAdv.toFixed(1)} | ${f1(r.dLh)} | ` +
    `${f3(r.ourEm)}/${f3(r.refEm)} |`),
  ``,
  `## next`,
  ``,
  `Single-line cases can't give a line box from one ink band. gen-reference.py`,
  `needs a **line-probe** slide per case (first run repeated 6×) so the band gaps`,
  `yield the advance directly — that is the clean \`office\` line-height number.`,
  ``,
].join('\n');

writeFileSync(resolve(HERE, 'report.md'), md);
console.log(md);
console.log(`\nwrote report.md + ${rows.length}× __diffs__/`);
