/**
 * _selftest.ts — synthesise refs/ from ours/ (our render on a slide-sized white
 * canvas with a red border at the content box) so measure-ref.ts + diff.ts can
 * be exercised without a PowerPoint export. ΔH/ΔW should come out ~0.
 * Not part of the real flow — delete refs/ afterwards.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { OURS_DIR, REFS_DIR, SLIDE_W_PT } from './lib.ts';

const PPP = 3;
const MARGIN_PT = 24;

for (const f of readdirSync(OURS_DIR).filter((f) => f.endsWith('.json'))) {
  const o = JSON.parse(readFileSync(resolve(OURS_DIR, f), 'utf8'));
  const slug = f.replace(/\.json$/, '');
  const our = PNG.sync.read(readFileSync(resolve(OURS_DIR, `${slug}.png`)));

  const W = Math.round(SLIDE_W_PT * PPP);
  const H = Math.round(300 * PPP);
  const canvas = new PNG({ width: W, height: H, fill: true });
  canvas.data.fill(255);

  const bx = Math.round(MARGIN_PT * PPP);
  const by = Math.round(MARGIN_PT * PPP);
  const bw = Math.round(o.contentWpt * PPP);
  const bh = Math.round(o.contentHpt * PPP);

  // blit our render at the box origin
  for (let y = 0; y < Math.min(our.height, bh); y++)
    for (let x = 0; x < Math.min(our.width, bw); x++) {
      const s = (y * our.width + x) * 4, d = ((by + y) * W + bx + x) * 4;
      canvas.data[d] = our.data[s]; canvas.data[d + 1] = our.data[s + 1];
      canvas.data[d + 2] = our.data[s + 2]; canvas.data[d + 3] = 255;
    }
  // red border rectangle
  const put = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const d = (y * W + x) * 4;
    canvas.data[d] = 255; canvas.data[d + 1] = 0; canvas.data[d + 2] = 0; canvas.data[d + 3] = 255;
  };
  for (let x = bx; x <= bx + bw; x++) { put(x, by); put(x, by + bh); }
  for (let y = by; y <= by + bh; y++) { put(bx, y); put(bx + bw, y); }

  writeFileSync(resolve(REFS_DIR, `${slug}.png`), PNG.sync.write(canvas));
}
console.log('synthetic refs/ written from ours/ — run measure-ref.ts then diff.ts');
