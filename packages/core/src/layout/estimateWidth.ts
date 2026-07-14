/**
 * estimateWidth.ts — per-fragment width resolution.
 *
 * Two sources (priority order):
 *   1. Exact measurement via FontMetricsProvider.measureText() — fontkit / opentype.js
 *   2. Weight-based fallback estimatePartialWidth — when no font data available
 *
 * After any measurement — correctToSumInvariant to preserve line-breaking invariant.
 */

// ── Weight-based fallback ─────────────────────────────────────────────

/**
 * Per-character weight for approximate width estimation.
 * More accurate than charCount/totalChars for proportional fonts.
 *
 * Values:
 *   - space      = 0.35
 *   - narrow cha = 0.4 (i, l, ., ,, ;, :, ', !, |)
 *   - default    = 1.0
 */
const CHAR_WEIGHT: Record<string, number> = {};
for (const c of ' \t') CHAR_WEIGHT[c] = 0.35;
for (const c of 'iIl.,;:\'!|') CHAR_WEIGHT[c] = 0.4;

function charWeight(c: string): number {
  return CHAR_WEIGHT[c] ?? 1.0;
}

/**
 * Weight-based fallback width estimation.
 *
 * Distributes occupiedWidth proportionally by character weights:
 *   fragmentWidth = (fragmentWeight / totalWeight) * occupiedWidth
 *
 * Used when FontMetricsProvider.measureText() is unavailable (returns -1).
 * Significantly better than charCount/totalChars for proportional fonts.
 */
function estimatePartialWidth(
  fragment: string,
  occupiedWidth: number,
  fullFragmentText: string,
): number {
  if (!fragment || !fullFragmentText || occupiedWidth <= 0) return 0;

  const fragmentWeight = [...fragment].reduce((sum, c) => sum + charWeight(c), 0);
  const totalWeight = [...fullFragmentText].reduce((sum, c) => sum + charWeight(c), 0);

  if (totalWeight <= 0) return 0;
  return (fragmentWeight / totalWeight) * occupiedWidth;
}

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
  measureFn?: MeasureFn,
): number[] {
  if (fragments.length === 0) return [];
  if (fragments.length === 1) {
    // Single fragment — no distribution needed
    return [occupiedWidth];
  }

  // Step 1: Measure each fragment (exact or fallback)
  const measured = fragments.map(f => {
    // Try exact measurement first
    if (measureFn) {
      const exact = measureFn(f);
      if (exact >= 0) return exact;
    }
    // Fallback: weight-based estimate
    return estimatePartialWidth(f, occupiedWidth, fullText);
  });

  // Step 2: Correct to sum invariant (always, regardless of source)
  return correctToSumInvariant(measured, occupiedWidth);
}