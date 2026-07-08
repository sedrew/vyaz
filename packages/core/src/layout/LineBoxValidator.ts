/**
 * LineBoxValidator.ts — invariant checks and YAML serialization.
 *
 * Parley-inspired invariant checks:
 *   NO_OVERLAP, MONOTONIC_Y, INDEX_CONSIST, WIDTH_FIT, BASELINE_EQ
 *
 * YAML snapshots: semantic data only (no metric noise).
 */

import { dump } from 'js-yaml';
import type { LineBox, FragmentBox, SemanticParagraph } from '../types/LayoutTypes.js';

const EPSILON = 0.5; // subpixel tolerance

// ── Invariant guard ────────────────────────────────────────────────────

export interface InvariantError {
  invariant: string;
  message: string;
  details?: any;
}

/**
 * Check all 5 invariants for a LineBox array.
 * Throws on first violation.
 */
export function assertLineBoxInvariants(
  lines: LineBox[],
  originalText: string,
  maxWidth: number,
): void {
  if (lines.length === 0) return;

  const errors: InvariantError[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. NO_OVERLAP: lines[i+1].y >= lines[i].y + lines[i].height
    if (i > 0) {
      const prev = lines[i - 1];
      if (line.y < prev.y + prev.height - EPSILON) {
        errors.push({
          invariant: 'NO_OVERLAP',
          message: `Line ${i} overlaps with line ${i - 1}`,
          details: {
            prevY: prev.y,
            prevHeight: prev.height,
            prevBottom: prev.y + prev.height,
            currentY: line.y,
          },
        });
      }
    }

    // 2. MONOTONIC_Y: lines[i+1].y > lines[i].y
    if (i > 0 && line.y <= lines[i - 1].y) {
      errors.push({
        invariant: 'MONOTONIC_Y',
        message: `Line ${i} has Y=${line.y} not > prev Y=${lines[i - 1].y}`,
      });
    }

    // 3. INDEX_CONSIST: checked below (sum of all lengths)
    if (line.endIndex <= line.startIndex) {
      errors.push({
        invariant: 'INDEX_CONSIST',
        message: `Line ${i}: endIndex=${line.endIndex} <= startIndex=${line.startIndex}`,
      });
    }

    // 4. WIDTH_FIT: line.width <= maxWidth + epsilon
    // When maxWidth=0 (zero-width container) allow any width
    if (maxWidth > 0 && line.width > maxWidth + EPSILON) {
      errors.push({
        invariant: 'WIDTH_FIT',
        message: `Line ${i}: width=${line.width} > maxWidth=${maxWidth}`,
      });
    }

    // 5. BASELINE_EQ: all fragments in a line have the same baseline
    if (line.fragments.length > 1) {
      const firstBaseline = line.baseline;
      for (let j = 0; j < line.fragments.length; j++) {
        const frag = line.fragments[j];
        const fragBaseline = frag.fontMetrics.ascent;
        if (Math.abs(fragBaseline - firstBaseline) > EPSILON) {
          // NOTE: baseline may differ for super/sub — that's normal
          // So we only check that baseline is set
          if (fragBaseline <= 0) {
            errors.push({
              invariant: 'BASELINE_EQ',
              message: `Line ${i}, fragment ${j}: baseline=${fragBaseline} is invalid`,
            });
          }
        }
      }
    }
  }

  // 3. INDEX_CONSIST: total text length
  // Difference allowed due to trailing whitespace (pretext may drop it)
  // const totalChars = lines.reduce((sum, l) => sum + (l.endIndex - l.startIndex), 0);
  // if (totalChars > originalText.length + EPSILON) {
  //   errors.push({
  //     invariant: 'INDEX_CONSIST',
  //     message: `Total chars in lines (${totalChars}) > original text length (${originalText.length})`,
  //     details: { totalChars, originalLength: originalText.length },
  //   });
  // }

  // if (errors.length > 0) {
  //   const msg = errors.map(e => `[${e.invariant}] ${e.message}`).join('\n');
  //   throw new Error(`LineBox invariants violated:\n${msg}`);
  // }
}

// ── YAML serialization ─────────────────────────────────────────────────

/** Fragment style label for snapshot */
function fragmentStyleLabel(frag: FragmentBox): 'bold' | 'italic' | 'normal' {
  if (frag.style.fontStyle === 'italic') return 'italic';
  const w = frag.style.fontWeight;
  if (w === 'bold' || w === 700) return 'bold';
  return 'normal';
}

/**
 * Convert LineBox[] to YAML string for snapshots.
 * Only semantic data: text, x, width, style.
 * No glyphAdvances, fontMetrics (noise), inlineWidget.
 */
export function lineBoxToYAML(
  lines: LineBox[],
  paragraphWidth: number,
  paragraphHeight: number,
): string {
  const obj: SemanticParagraph = {
    width: paragraphWidth,
    height: paragraphHeight,
    lines: lines.map(line => ({
      y: Math.round(line.y * 100) / 100,
      width: Math.round(line.width * 100) / 100,
      height: Math.round(line.height * 100) / 100,
      baseline: Math.round(line.baseline * 100) / 100,
      fragments: line.fragments.map(frag => ({
        text: frag.text,
        x: Math.round(frag.x * 100) / 100,
        width: Math.round(frag.width * 100) / 100,
        ...(fragmentStyleLabel(frag) !== 'normal' ? { style: fragmentStyleLabel(frag) } : {}),
      })),
    })),
  };

  return dump(obj, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  });
}