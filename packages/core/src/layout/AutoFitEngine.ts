/**
 * AutoFitEngine.ts — proportional font-size scaling (autofit).
 *
 * Algorithm: binary search for scale in [0.0, 1.0].
 * For each candidate scale: temporarily scale fontSize,
 * run full layout, check whether the result fits in
 * maxWidth × maxHeight.
 *
 * Proportions are preserved: every TextRun's fontSize is multiplied
 * by the same scale, the visual hierarchy is unchanged.
 * inlineWidget dimensions are NOT scaled (images keep their size).
 */

import type { TextFrame } from '../types/Document.js';

/** Autofit options */
export interface AutoFitOptions {
  minScale?: number;       // minimum scale (default 0.1)
  tolerance?: number;      // binary search tolerance (default 0.01)
  maxIterations?: number;  // max iterations (default 50)
}

/** Autofit result */
export interface AutoFitResult {
  scaleFactor: number;     // 0.0 … 1.0
}

/**
 * Apply a scale factor to all fontSize values in the document.
 * inlineWidget dimensions are NOT scaled.
 * Returns a NEW document (does not mutate the original).
 *
 * Sizes are rounded to two decimals — what a caller re-deriving the size from
 * `scale` would get. Autofit measures through {@link applyScaleExact} instead: see
 * there for why the rounded size is the wrong one to measure.
 */
export function applyScale(
  doc: TextFrame,
  scale: number,
): TextFrame {
  return scaleFontSizes(doc, scale, true);
}

/**
 * Same as {@link applyScale}, but leaves the scaled sizes exact.
 *
 * Autofit probes candidates with this. `applyScale` can round a candidate *down* —
 * an authored 13.3333px at 94% becomes 12.53px (9.3975pt) instead of 12.5333px
 * (9.4pt) — so a candidate that does not fit at the size it names gets measured as
 * if it were smaller, and 0.003 of a unit is enough to flip a line break once glyph
 * advances sit on a 1/8pt grid. Measuring the unrounded size keeps the fit decision
 * about the size the caller actually renders.
 *
 * @internal
 */
export function applyScaleExact(
  doc: TextFrame,
  scale: number,
): TextFrame {
  return scaleFontSizes(doc, scale, false);
}

function scaleFontSizes(
  doc: TextFrame,
  scale: number,
  round: boolean,
): TextFrame {
  const clone = JSON.parse(JSON.stringify(doc)) as TextFrame;
  const scaled = (size: number): number =>
    round ? Math.round(size * scale * 100) / 100 : size * scale;

  for (const paragraph of clone.paragraphs) {
    for (const run of paragraph.children) {
      if (typeof run.fontSize === 'number') {
        run.fontSize = scaled(run.fontSize);
      }
    }
  }

  if (clone.defaultStyle?.fontSize) {
    clone.defaultStyle.fontSize = scaled(clone.defaultStyle.fontSize);
  }

  return clone;
}

/**
 * Find the optimal scale factor for a document.
 *
 * @param doc — source document
 * @param layoutFn — layout(doc) → { height: number; width: number }
 * @param config — autofit maxWidth/maxHeight
 * @param options — search precision
 */
export function findScale(
  doc: TextFrame,
  layoutFn: (scaledDoc: TextFrame) => { height: number; width: number },
  config: { maxWidth: number; maxHeight: number },
  options?: AutoFitOptions,
): AutoFitResult {
  const minScale = options?.minScale ?? 0.1;
  const tolerance = options?.tolerance ?? 0.01;
  const maxIterations = options?.maxIterations ?? 50;
  const maxHeight = config.maxHeight;
  const maxWidth = config.maxWidth;

  // Check original size
  const origResult = layoutFn(doc);
  if (origResult.height <= maxHeight && origResult.width <= maxWidth) {
    return { scaleFactor: 1 };
  }

  // Binary search
  let lo = minScale;
  let hi = 1.0;
  let best = minScale;

  for (let iter = 0; iter < maxIterations; iter++) {
    const mid = (lo + hi) / 2;
    const scaledDoc = applyScale(doc, mid);
    const result = layoutFn(scaledDoc);

    if (result.height <= maxHeight && result.width <= maxWidth) {
      // scale is valid — try larger
      best = mid;
      lo = mid + tolerance / 2;
    } else {
      // scale is invalid — try smaller
      hi = mid - tolerance / 2;
    }

    if (hi - lo < tolerance) break;
  }

  return { scaleFactor: Math.round(best * 100) / 100 };
}