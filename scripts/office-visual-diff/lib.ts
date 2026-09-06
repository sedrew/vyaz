/**
 * lib.ts — shared paths, font registration, PNG helpers for the office
 * visual-diff experiment.
 */
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

export const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, '../..');
export const CORPUS = resolve(ROOT, 'packages/renderers/tests/cases');
export const FIXTURES = resolve(ROOT, 'packages/core/tests/fixtures');

export const OURS_DIR = resolve(HERE, 'ours');
export const REFS_DIR = resolve(HERE, 'refs');
export const DIFFS_DIR = resolve(HERE, '__diffs__');
export const MANIFEST = resolve(HERE, '_manifest.json');
export const ADAPTER = resolve(HERE, '_adapter.json');
for (const d of [OURS_DIR, REFS_DIR, DIFFS_DIR]) mkdirSync(d, { recursive: true });

/** vyaz-unit → point is 1:1 here; slide is 960×540 units. */
export const SLIDE_W_PT = 960;

// ── fonts ───────────────────────────────────────────────────────────────
const FIXTURE_FONTS: Record<string, string> = {
  Roboto: 'Roboto-VariableFont_wdth,wght.ttf',
  Inter: 'Inter-Variable.ttf',
  'Great Vibes': 'GreatVibes-Regular.ttf',
  Unifont: 'unifont-17.0.05.otf',
};
const MAC_ARIAL: Record<string, string> = {
  'Arial|normal|normal': '/System/Library/Fonts/Supplemental/Arial.ttf',
  'Arial|bold|normal': '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
  'Arial|normal|italic': '/System/Library/Fonts/Supplemental/Arial Italic.ttf',
  'Arial|bold|italic': '/System/Library/Fonts/Supplemental/Arial Bold Italic.ttf',
};

/** ttf/otf paths to hand resvg. `OFFICE_DIFF_FONTS=a.ttf:b.ttf` prepends extras. */
export function resvgFontFiles(): string[] {
  const extra = (process.env.OFFICE_DIFF_FONTS ?? '').split(':').filter(Boolean);
  const fx = Object.values(FIXTURE_FONTS).map((f) => resolve(FIXTURES, f));
  return [...extra, ...fx, ...Object.values(MAC_ARIAL)].filter(existsSync);
}

/** Register every family vyaz's `office` measurer needs. Idempotent-ish. */
export async function registerOfficeFonts(): Promise<string[]> {
  const { fontMetricsProvider, createFontFace } = await import('../../packages/core/src/index.ts');
  fontMetricsProvider.setMode('office');
  const done: string[] = [];
  // some corpus cases spell it "GreatVibes"; "Arial Black" etc. fall through
  const ALIAS: Record<string, string> = { GreatVibes: 'Great Vibes' };
  for (const [family, file] of Object.entries(FIXTURE_FONTS)) {
    const p = resolve(FIXTURES, file);
    if (!existsSync(p)) continue;
    const buf = readFileSync(p);
    const names = [family, ...Object.entries(ALIAS).filter(([, v]) => v === family).map(([k]) => k)];
    for (const n of names)
      for (const weight of ['normal', 'bold'] as const)
        for (const style of ['normal', 'italic'] as const)
          await fontMetricsProvider.registerFont(n, { weight, style }, buf);
    try { await createFontFace(buf); } catch { /* metrics-only is fine */ }
    done.push(family);
  }
  for (const [key, p] of Object.entries(MAC_ARIAL)) {
    if (!existsSync(p)) continue;
    const [family, weight, style] = key.split('|') as [string, 'normal' | 'bold', 'normal' | 'italic'];
    try { await fontMetricsProvider.registerFont(family, { weight, style }, readFileSync(p)); } catch { /* */ }
  }
  if (existsSync('/System/Library/Fonts/Supplemental/Arial.ttf')) done.push('Arial');
  await fontMetricsProvider.waitForPendingRegistrations?.();
  return done;
}

// ── PNG helpers ─────────────────────────────────────────────────────────
export const readPng = (p: string): PNG => PNG.sync.read(readFileSync(p));
export const writePng = (p: string, png: PNG): void => {
  const { writeFileSync } = require('node:fs') as typeof import('node:fs');
  writeFileSync(p, PNG.sync.write(png));
};

export interface BBox { x: number; y: number; w: number; h: number }

/** Bounding box of pixels matching `hit`, else null. */
export function maskBBox(png: PNG, hit: (r: number, g: number, b: number, a: number) => boolean): BBox | null {
  const { width, height, data } = png;
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (!hit(data[i], data[i + 1], data[i + 2], data[i + 3])) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export const isRedBorder = (r: number, g: number, b: number, a: number): boolean =>
  a > 40 && r > 150 && g < 110 && b < 110;

/** Crop a sub-rect (clamped). */
export function crop(src: PNG, b: BBox): PNG {
  const x0 = Math.max(0, Math.floor(b.x)), y0 = Math.max(0, Math.floor(b.y));
  const w = Math.min(src.width - x0, Math.round(b.w)), h = Math.min(src.height - y0, Math.round(b.h));
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++)
    src.data.copy(out.data, y * w * 4, ((y0 + y) * src.width + x0) * 4, ((y0 + y) * src.width + x0 + w) * 4);
  return out;
}

/** Nearest-neighbour resize. */
export function resizePng(src: PNG, w: number, h: number): PNG {
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const sx = Math.min(src.width - 1, Math.floor((x / w) * src.width));
      const sy = Math.min(src.height - 1, Math.floor((y / h) * src.height));
      src.data.copy(out.data, (y * w + x) * 4, (sy * src.width + sx) * 4, (sy * src.width + sx) * 4 + 4);
    }
  return out;
}

/**
 * Stacked panels on white, each separated by a grey rule:
 *   1  PowerPoint crop
 *   2  vyaz render (scaled to the same width)
 *   3  overlay — vyaz ink in magenta over the PowerPoint crop
 */
export function triptych(a: PNG, b: PNG): PNG {
  const w = Math.max(a.width, b.width, 1);
  const bScaled = b.width === w ? b : resizePng(b, w, Math.max(1, Math.round((b.height * w) / b.width)));
  const bOverlay = resizePng(b, a.width, a.height);
  const rule = 3;
  const panels: { png: PNG; over?: PNG }[] = [{ png: a }, { png: bScaled }, { png: a, over: bOverlay }];
  const h = panels.reduce((s, p) => s + p.png.height, 0) + rule * (panels.length - 1);
  const out = new PNG({ width: w, height: h, fill: true });
  out.data.fill(255);

  let y0 = 0;
  for (const [i, p] of panels.entries()) {
    if (i > 0) {
      for (let y = y0; y < y0 + rule; y++)
        for (let x = 0; x < w; x++) {
          const d = (y * w + x) * 4;
          out.data[d] = out.data[d + 1] = out.data[d + 2] = 150; out.data[d + 3] = 255;
        }
      y0 += rule;
    }
    for (let y = 0; y < p.png.height; y++)
      for (let x = 0; x < p.png.width; x++) {
        const s = (y * p.png.width + x) * 4, d = ((y0 + y) * w + x) * 4;
        out.data[d] = p.png.data[s]; out.data[d + 1] = p.png.data[s + 1];
        out.data[d + 2] = p.png.data[s + 2]; out.data[d + 3] = 255;
      }
    if (p.over) {
      for (let y = 0; y < Math.min(p.over.height, p.png.height); y++)
        for (let x = 0; x < Math.min(p.over.width, p.png.width); x++) {
          const s = (y * p.over.width + x) * 4;
          if (!(p.over.data[s] < 160 && p.over.data[s + 1] < 160 && p.over.data[s + 2] < 160)) continue;
          const d = ((y0 + y) * w + x) * 4;
          out.data[d] = 230; out.data[d + 1] = 20; out.data[d + 2] = 130;
        }
    }
    y0 += p.png.height;
  }
  return out;
}
