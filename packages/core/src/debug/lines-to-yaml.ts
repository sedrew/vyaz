/**
 * lines-to-yaml.ts — semantic YAML serialization of laid-out lines.
 *
 * Debug/snapshot tooling only. Reached through the `@vyaz/core/debug` entry so
 * that `js-yaml` never lands in the production `@vyaz/core` bundle.
 */

import { dump } from 'js-yaml';
import type { Line, Span, SemanticParagraph } from '../types/LayoutTypes.js';

/** Span style label for snapshot */
function spanStyleLabel(span: Span): 'bold' | 'italic' | 'normal' {
  if (span.style.fontStyle === 'italic') return 'italic';
  const w = span.style.fontWeight;
  if (w === 'bold' || w === 700) return 'bold';
  return 'normal';
}

/**
 * Convert Line[] to YAML string for snapshots.
 * Only semantic data: text, x, width, style.
 * No glyphAdvances, fontMetrics (noise), inlineWidget.
 */
export function linesToYAML(
  lines: Line[],
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
      fragments: line.spans.map(span => ({
        text: span.text,
        x: Math.round(span.x * 100) / 100,
        width: Math.round(span.width * 100) / 100,
        ...(spanStyleLabel(span) !== 'normal' ? { style: spanStyleLabel(span) } : {}),
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
