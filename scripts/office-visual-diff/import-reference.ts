/**
 * import-reference.ts — drop exported slide PNGs into refs/.
 *
 *   bun scripts/office-visual-diff/import-reference.ts <folder-with-slide-pngs>
 *
 * Matches each PNG to a slide by its trailing number (Slide1.PNG, slide-01.png,
 * …-1.png); falls back to sorted order. Copies to refs/<slug>.png. Nothing in
 * the corpus is touched — this experiment stays inside scripts/office-visual-diff.
 */
import { readdirSync, readFileSync, copyFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { MANIFEST, REFS_DIR } from './lib.ts';

const src = process.argv[2];
if (!src) {
  console.error('usage: bun scripts/office-visual-diff/import-reference.ts <png-folder>');
  process.exit(1);
}

const { slides } = JSON.parse(readFileSync(MANIFEST, 'utf8')) as {
  slides: { slide: number; name: string }[];
};
const slug = (name: string) => name.replace(/\//g, '__');

const pngs = readdirSync(src)
  .filter((f) => /\.png$/i.test(f))
  .map((f) => ({ f, n: Number(f.match(/(\d+)(?=\D*\.png$)/i)?.[1] ?? NaN) }))
  .sort((a, b) => (Number.isNaN(a.n) || Number.isNaN(b.n) ? a.f.localeCompare(b.f) : a.n - b.n));

let done = 0;
for (const [i, s] of slides.entries()) {
  const pick = pngs.find((p) => p.n === s.slide) ?? pngs[i];
  if (!pick) { console.warn(`! no png for slide ${s.slide} (${s.name})`); continue; }
  copyFileSync(join(src, pick.f), resolve(REFS_DIR, `${slug(s.name)}.png`));
  done++;
}
console.log(`imported ${done}/${slides.length} → ${REFS_DIR}`);
console.log('next: bun scripts/office-visual-diff/measure-ref.ts && bun scripts/office-visual-diff/diff.ts');
