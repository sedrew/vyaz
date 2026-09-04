/**
 * widths.ts — resolve the CSS-style 1/2/4-value `Widths` shorthand used by
 * `TableTypes.ts` (`n` | `[tb, lr]` | `[t, r, b, l]`, CSS clockwise order).
 */
import type { Widths } from '../types/TableTypes.js';

export type Side = 'top' | 'right' | 'bottom' | 'left';

/** Resolve one side of a `Widths` shorthand. `undefined` → `fallback` (default `0`). */
export function resolveWidth(w: Widths | undefined, side: Side, fallback = 0): number {
  if (w === undefined) return fallback;
  if (typeof w === 'number') return w;
  if (w.length === 2) {
    const [tb, lr] = w;
    return side === 'top' || side === 'bottom' ? tb : lr;
  }
  const [t, r, b, l] = w;
  return side === 'top' ? t : side === 'right' ? r : side === 'bottom' ? b : l;
}

/** Resolve all four sides at once. */
export function resolveWidths(w: Widths | undefined, fallback = 0): { top: number; right: number; bottom: number; left: number } {
  return {
    top: resolveWidth(w, 'top', fallback),
    right: resolveWidth(w, 'right', fallback),
    bottom: resolveWidth(w, 'bottom', fallback),
    left: resolveWidth(w, 'left', fallback),
  };
}
