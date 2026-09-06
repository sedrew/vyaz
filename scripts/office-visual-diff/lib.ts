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

/** side-by-side [a | b | overlay(b magenta over a)] on white. */
export function triptych(a: PNG, b: PNG): PNG {
  const h = Math.max(a.height, b.height);
  const bScaled = b.height === h ? b : resizePng(b, Math.round((b.width * h) / b.height), h);
  const gap = 12;
  const w = a.width + gap + bScaled.width + gap + a.width;
  const out = new PNG({ width: w, height: h, fill: true });
  out.data.fill(255);
  const blit = (src: PNG, dx: number) => {
    for (let y = 0; y < src.height; y++)
      for (let x = 0; x < src.width; x++) {
        const s = (y * src.width + x) * 4, d = (y * w + dx + x) * 4;
        out.data[d] = src.data[s]; out.data[d + 1] = src.data[s + 1];
        out.data[d + 2] = src.data[s + 2]; out.data[d + 3] = 255;
      }
  };
  blit(a, 0);
  blit(bScaled, a.width + gap);
  // overlay
  const ox = a.width + gap + bScaled.width + gap;
  blit(a, ox);
  const bo = resizePng(b, a.width, a.height);
  for (let y = 0; y < a.height; y++)
    for (let x = 0; x < a.width; x++) {
      const s = (y * a.width + x) * 4;
      const dark = bo.data[s] < 160 && bo.data[s + 1] < 160 && bo.data[s + 2] < 160;
      if (!dark) continue;
      const d = (y * w + ox + x) * 4;
      out.data[d] = 230; out.data[d + 1] = 20; out.data[d + 2] = 130;
    }
  return out;
}
