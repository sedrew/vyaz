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
 */
export function applyScale(
  doc: TextFrame,
  scale: number,
): TextFrame {
  const clone = JSON.parse(JSON.stringify(doc)) as TextFrame;

  for (const paragraph of clone.paragraphs) {
    for (const run of paragraph.children) {
      run.fontSize = Math.round(run.fontSize * scale * 100) / 100;
    }
  }

  if (clone.defaultStyle?.fontSize) {
    clone.defaultStyle.fontSize = Math.round(clone.defaultStyle.fontSize * scale * 100) / 100;
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