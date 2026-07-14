/**
 * estimateWidth.ts — per-fragment width resolution.
 *
 * Uses exact measurement via FontMetricsProvider.measureText() (fontkit).
 * After measurement — correctToSumInvariant to preserve line-breaking invariant.
 */

// ── Invariant correction ─────────────────────────────────────────────

/**
 * Correct fragment widths so that their sum equals occupiedWidth.
 *
 * Why needed: fontkit-based measurement measures each fragment independently,
 * so the sum may drift from occupiedWidth due to:
 *   - kerning across fragment boundaries
 *   - letterSpacing adjustments from pretext
 *   - rounding differences between font parsers
 *
 * The correction distributes delta proportionally to each measured width.
 * For fallback estimates (which already sum to occupiedWidth exactly),
 * this is effectively a no-op.
 */
export function correctToSumInvariant(
  measured: number[],
  occupiedWidth: number,
): number[] {
  const sum = measured.reduce((a, b) => a + b, 0);
  if (sum === 0 || Math.abs(occupiedWidth - sum) < 0.001) {
    // Already within rounding tolerance — return as-is
    return measured;
  }

  const delta = occupiedWidth - sum;
  // Distribute delta proportionally to each width
  return measured.map(m => m + (m / sum) * delta);
}

// ── Main entry point ─────────────────────────────────────────────────

export type MeasureFn = (text: string) => number;

/**
 * Resolve widths for fragments of a single text group.
 *
 * Each group consists of pieces split from the same pretext fragment
 * (e.g. leading-space + trimmed-text + trailing-space). Their widths
 * must sum to occupiedWidth (pretext's measurement) to preserve the
 * line-breaking invariant.
 *
 * @param fragments    — array of text pieces (e.g. [" ", "between", " form"])
 * @param fullText     — concatenation of all fragments (the original pretext fragment text)
 * @param occupiedWidth — total width from pretext (gapBefore + textWidth)
 * @param measureFn    — optional callback for exact measurement via font metrics provider
 * @returns widths that sum to occupiedWidth (within floating point tolerance)
 */
export function resolveFragmentWidths(
  fragments: string[],
  fullText: string,
  occupiedWidth: number,
  measureFn: MeasureFn,
): number[] {
  if (fragments.length === 0) return [];
  if (fragments.length === 1) {
    // Single fragment — no distribution needed
    return [occupiedWidth];
  }

  // Step 1: Measure each fragment exactly via fontkit
  // measureFn throws FontNotFoundError if font not registered
  const measured = fragments.map(f => measureFn(f));

  // Step 2: Correct to sum invariant
  return correctToSumInvariant(measured, occupiedWidth);
}