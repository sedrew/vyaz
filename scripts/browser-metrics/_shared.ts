/**
 * _shared.ts — helpers common to report.ts and browser-metrics.test.ts.
 *
 * The one non-obvious bit is optical sizing: Chrome applies
 * `font-optical-sizing: auto` by default, so a font with an `opsz` axis is
 * measured by the browser at `opsz == font-size` (clamped to the axis range).
 * fontkit must instance the same way or large sizes diverge badly (Inter loses
 * ~10% width at 48px otherwise).
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const FIX = resolve(dirname(fileURLToPath(import.meta.url)), '../../packages/core/tests/fixtures');

export const CORPUS = JSON.parse(readFileSync(resolve(FIX, 'corpus.json'), 'utf8'));
export const fixturePath = (file: string) => resolve(FIX, file);
export const oracleDir = resolve(FIX, 'browser-metrics');
export const fileForFamily = (family: string) =>
  CORPUS.fonts.find((f: any) => f.family === family).file;

/** Categories that are not a fair fontkit-vs-browser comparison. */
export const EXCLUDED_CATEGORIES = new Set(['whitespace']); // SVG getComputedTextLength trims edge spaces
/** (family, script) pairs where the browser font-fallbacks (no real coverage). */
export const EXCLUDED_FAMILY_SCRIPT = new Set(['GreatVibes\tgreek']);

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Register one oracle font and return a `(size) => FontFace` accessor.
 * When the font has an `opsz` axis, a distinct instance is registered per
 * corpus size with `opsz` pinned to that size.
 */
export async function registerOracleFont(
  provider: any,
  createFontFace: any,
  family: string,
  weight: string,
  baseVariation: Record<string, number> | null,
): Promise<(size: number) => any> {
  const buf = readFileSync(fixturePath(fileForFamily(family)));
  const probe = await createFontFace(buf);
  const axes = probe.axes ?? probe._raw?.variationAxes ?? {};
  const hasOpsz = 'opsz' in axes;

  if (!hasOpsz) {
    const key = `${family}@${weight}`;
    await provider.registerFont(key, { weight, ...(baseVariation ? { variation: baseVariation } : {}) }, buf);
    const font = provider.getFont(key, weight);
    return () => font;
  }

  const { min, max } = axes.opsz;
  const perSize = new Map<number, any>();
  for (const size of CORPUS.sizes) {
    const variation = { ...(baseVariation ?? {}), opsz: clamp(size, min, max) };
    const key = `${family}@${weight}@opsz${size}`;
    await provider.registerFont(key, { weight, variation }, buf);
    perSize.set(size, provider.getFont(key, weight));
  }
  return (size: number) => perSize.get(size);
}
