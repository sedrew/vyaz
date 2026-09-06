/**
 * measure-ref.ts — read PowerPoint's text-block box out of each exported slide.
 *
 *   bun scripts/office-visual-diff/measure-ref.ts
 *
 * The reference box has a red hairline border and zero insets, so the bounding
 * box of red pixels ≈ PowerPoint's own text block. Slide width is a known
 * 960 pt, so pngWidth fixes the px-per-pt scale; from there the box in points.
 * Writes refs/<slug>.json  { pxPerPt, blockWpt, blockHpt, innerBBoxPx }.
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REFS_DIR, SLIDE_W_PT, readPng, maskBBox, isRedBorder } from './lib.ts';

const files = readdirSync(REFS_DIR).filter((f) => /\.png$/.test(f) && !f.startsWith('_'));
if (!files.length) {
  console.error(`no PNGs in ${REFS_DIR} — run import-reference.ts first`);
  process.exit(1);
}

let ok = 0;
const rows: string[] = [];
for (const f of files) {
  const slug = f.replace(/\.png$/, '');
  const png = readPng(resolve(REFS_DIR, f));
  const pxPerPt = png.width / SLIDE_W_PT;

  const border = maskBBox(png, isRedBorder);
  if (!border) { console.warn(`  ✗ ${slug}: no red border found`); continue; }

  // border stroke ≈ 0.75pt; the box edge is its centreline → inset half a stroke
  const s = Math.max(1, Math.round(0.75 * pxPerPt));
  const inner = {
    x: border.x + s, y: border.y + s,
    w: Math.max(1, border.w - 2 * s), h: Math.max(1, border.h - 2 * s),
  };
  const out = {
    slug, pngW: png.width, pngH: png.height, pxPerPt,
    blockWpt: inner.w / pxPerPt,
    blockHpt: inner.h / pxPerPt,
    innerBBoxPx: inner,
    borderBBoxPx: border,
  };
  writeFileSync(resolve(REFS_DIR, `${slug}.json`), JSON.stringify(out, null, 2));
  rows.push(`  ${slug.padEnd(34)} ${out.blockWpt.toFixed(1).padStart(7)} × ${out.blockHpt.toFixed(1).padStart(6)} pt   (${pxPerPt.toFixed(2)} px/pt)`);
  ok++;
}
console.log(`measured ${ok}/${files.length}:\n${rows.join('\n')}`);
