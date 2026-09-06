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

/** black-ish painted glyph, ignoring the red border and white ground */
const isInk = (r: number, g: number, b: number, a: number): boolean =>
  a > 60 && r < 170 && g < 170 && b < 170 && !(r > 150 && g < 110 && b < 110);

/** horizontal ink bands: [top,bottom] px runs where a row has ≥ `minRun` dark px */
function inkBands(png: any, minRun = 4): { top: number; bottom: number }[] {
  const { width, height, data } = png;
  const bands: { top: number; bottom: number }[] = [];
  let start = -1;
  for (let y = 0; y < height; y++) {
    let n = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (isInk(data[i], data[i + 1], data[i + 2], data[i + 3])) n++;
    }
    const on = n >= minRun;
    if (on && start < 0) start = y;
    else if (!on && start >= 0) { bands.push({ top: start, bottom: y - 1 }); start = -1; }
  }
  if (start >= 0) bands.push({ top: start, bottom: height - 1 });
  return bands;
}

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
  // SHAPE_TO_FIT_TEXT is a no-op without PowerPoint re-fitting on open, so the
  // red border is the *declared* box, not the content box. Measure the painted
  // ink instead: bbox = glyph extent, bands = per-line rows (leading = gaps).
  const ink = maskBBox(png, isInk);
  if (!ink) { console.warn(`  ✗ ${slug}: no ink`); continue; }
  const bands = inkBands(png);
  const gaps = bands.slice(1).map((b, i) => b.top - bands[i].top); // band-top → band-top
  const lineAdvancePx = gaps.length ? gaps.sort((a, b) => a - b)[gaps.length >> 1] : ink.h;

  const out = {
    slug, pngW: png.width, pngH: png.height, pxPerPt,
    inkWpt: ink.w / pxPerPt,
    inkHpt: ink.h / pxPerPt,
    nBands: bands.length,
    lineAdvancePt: lineAdvancePx / pxPerPt,
    inkBBoxPx: ink,
    bandsPx: bands,
    borderBBoxPx: border,
  };
  writeFileSync(resolve(REFS_DIR, `${slug}.json`), JSON.stringify(out, null, 2));
  rows.push(`  ${slug.padEnd(34)} ink ${out.inkWpt.toFixed(1).padStart(6)}×${out.inkHpt.toFixed(1).padStart(5)}pt  ${out.nBands} band  adv ${out.lineAdvancePt.toFixed(1)}pt`);
  ok++;
}
console.log(`measured ${ok}/${files.length}:\n${rows.join('\n')}`);
