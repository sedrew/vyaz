/**
 * diff.ts — join vyaz `office` geometry with PowerPoint's measured box.
 *
 *   bun scripts/office-visual-diff/diff.ts
 *
 * Writes:
 *   report.md              roll-up, sorted by |ΔH%|
 *   __diffs__/<slug>.png   [ ref crop | our render | magenta overlay ]
 *   __diffs__/<slug>.md    the numbers for that case
 *
 * This is a *measurement* experiment — no thresholds, no pass/fail. The block
 * box is `content.width/height`; per-line is only a hint until baseline
 * detection lands.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  HERE, OURS_DIR, REFS_DIR, DIFFS_DIR, readPng, writePng, crop, triptych,
} from './lib.ts';

interface Ours {
  name: string; nLines: number; contentWpt: number; contentHpt: number; domFontPt: number;
  lines: { i: number; h: number }[];
}
interface Ref {
  slug: string; pxPerPt: number; blockWpt: number; blockHpt: number;
  innerBBoxPx: { x: number; y: number; w: number; h: number };
}

const oursBySlug = new Map<string, Ours>();
for (const f of readdirSync(OURS_DIR).filter((f) => f.endsWith('.json')))
  oursBySlug.set(f.replace(/\.json$/, ''), JSON.parse(readFileSync(resolve(OURS_DIR, f), 'utf8')));

const rows: {
  slug: string; name: string; font: string; dom: number; nOur: number;
  refW: number; ourW: number; dW: number;
  refH: number; ourH: number; dH: number;
  refEm: number; ourEm: number; refLineEm: number; ourLineEm: number;
}[] = [];

for (const f of readdirSync(REFS_DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_'))) {
  const ref: Ref = JSON.parse(readFileSync(resolve(REFS_DIR, f), 'utf8'));
  const ours = oursBySlug.get(ref.slug);
  if (!ours) { console.warn(`  – ${ref.slug}: no ours/`); continue; }

  const dW = ((ours.contentWpt - ref.blockWpt) / ref.blockWpt) * 100;
  const dH = ((ours.contentHpt - ref.blockHpt) / ref.blockHpt) * 100;
  const row = {
    slug: ref.slug,
    name: ours.name,
    font: '', // filled from input.json below
    dom: ours.domFontPt,
    nOur: ours.nLines,
    refW: ref.blockWpt, ourW: ours.contentWpt, dW,
    refH: ref.blockHpt, ourH: ours.contentHpt, dH,
    refEm: ref.blockHpt / ours.domFontPt,
    ourEm: ours.contentHpt / ours.domFontPt,
    refLineEm: ref.blockHpt / ours.nLines / ours.domFontPt,
    ourLineEm: ours.contentHpt / ours.nLines / ours.domFontPt,
  };
  // dominant family, for the table
  try {
    const input = JSON.parse(readFileSync(resolve(HERE, '../../packages/renderers/tests/cases', ours.name, 'input.json'), 'utf8'));
    const fams = input.frame.paragraphs.flatMap((p: any) => (p.children ?? []).map((r: any) => {
      const ff = r.fontFamily ?? input.frame.defaultStyle?.fontFamily ?? 'Arial';
      return Array.isArray(ff) ? ff[0] : ff;
    }));
    row.font = [...new Set(fams)].join('/').slice(0, 22);
  } catch { /* */ }
  rows.push(row);

  // triptych
  try {
    const refPng = readPng(resolve(REFS_DIR, `${ref.slug}.png`));
    const ourPng = readPng(resolve(OURS_DIR, `${ref.slug}.png`));
    writePng(resolve(DIFFS_DIR, `${ref.slug}.png`), triptych(crop(refPng, ref.innerBBoxPx), ourPng));
  } catch (e) { console.warn(`  – ${ref.slug}: image ${e}`); }

  writeFileSync(resolve(DIFFS_DIR, `${ref.slug}.md`), [
    `# ${ours.name}`,
    ``,
    `| | width pt | height pt | height ÷ ${ours.dom}pt | per-line ÷ font |`,
    `|---|--:|--:|--:|--:|`,
    `| PowerPoint | ${row.refW.toFixed(1)} | ${row.refH.toFixed(1)} | ${row.refEm.toFixed(3)} | ${row.refLineEm.toFixed(3)} |`,
    `| vyaz office | ${row.ourW.toFixed(1)} | ${row.ourH.toFixed(1)} | ${row.ourEm.toFixed(3)} | ${row.ourLineEm.toFixed(3)} |`,
    `| Δ | ${row.dW >= 0 ? '+' : ''}${row.dW.toFixed(1)}% | ${row.dH >= 0 ? '+' : ''}${row.dH.toFixed(1)}% | | |`,
    ``,
    `lines (vyaz): ${ours.nLines} · dominant font: ${row.font} ${ours.dom}pt`,
    ``,
    `![triptych](./${ref.slug}.png) — reference crop · vyaz render · overlay (vyaz magenta over PowerPoint)`,
  ].join('\n') + '\n');
}

rows.sort((a, b) => Math.abs(b.dH) - Math.abs(a.dH));

const f1 = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(1);
const md = [
  `# office parity — vyaz \`mode:'office'\` vs PowerPoint text-block box`,
  ``,
  `${rows.length} cases. Δ = (vyaz − PowerPoint) / PowerPoint. Block box = `,
  `\`content.{width,height}\` vs the exported hairline border. No pass/fail — a `,
  `measurement pass to see where \`office\` metrics sit. Per-case images + numbers `,
  `in \`__diffs__/\`.`,
  ``,
  `| case | font | font pt | lines | ref W | vyaz W | ΔW | ref H | vyaz H | ΔH | ref H÷pt | vyaz H÷pt |`,
  `|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|`,
  ...rows.map((r) =>
    `| ${r.name} | ${r.font} | ${r.dom} | ${r.nOur} | ${r.refW.toFixed(0)} | ${r.ourW.toFixed(0)} | ${f1(r.dW)}% | ` +
    `${r.refH.toFixed(0)} | ${r.ourH.toFixed(0)} | ${f1(r.dH)}% | ${r.refEm.toFixed(3)} | ${r.ourEm.toFixed(3)} |`),
  ``,
  `## reading`,
  ``,
  `- \`H÷pt\` for a **single-line** case is the em-ratio PowerPoint uses (~1.20 `,
  `  expected, font-independent) vs what \`office\` mode produces `,
  `  (\`winAscent/winDescent × 1.078\` today).`,
  `- \`ΔW\` should be near 0 — \`office-metrics\` already shows advance width matches `,
  `  PowerPoint to ±0.4%. A large \`ΔW\` means a font-mismatch (family not installed `,
  `  in PowerPoint → it substituted).`,
  `- multi-line \`ΔH\` mixes line-box error × line count; check \`ref H÷pt\` vs 1.2·lines.`,
  ``,
].join('\n');

writeFileSync(resolve(HERE, 'report.md'), md);
console.log(md);
console.log(`\nwrote report.md + ${rows.length}× __diffs__/`);
