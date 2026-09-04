/**
 * sides.ts — resolve the CSS-style 1/2/4-value `Sides<T>` shorthand used by
 * `TableTypes.ts` (`v` | `[tb, lr]` | `[t, r, b, l]`, CSS clockwise order).
 * `Widths` (numbers — paddings/margins/border widths) and `ColorsOnWidth`
 * (strings — border colors) are both instances of `Sides<T>`.
 */
import type { Sides, Widths, ColorsOnWidth, BorderLineCap, BorderPatterns } from '../types/TableTypes.js';

export type Side = 'top' | 'right' | 'bottom' | 'left';

/** Resolve one side of a `Sides<T>` shorthand. `undefined` → `fallback`. */
export function resolveSide<T>(v: Sides<T> | undefined, side: Side, fallback: T): T {
  if (v === undefined) return fallback;
  if (!Array.isArray(v)) return v;
  if (v.length === 2) {
    const [tb, lr] = v;
    return side === 'top' || side === 'bottom' ? tb : lr;
  }
  const [t, r, b, l] = v;
  return side === 'top' ? t : side === 'right' ? r : side === 'bottom' ? b : l;
}

/** Resolve all four sides of a `Sides<T>` shorthand at once. */
export function resolveAllSides<T>(v: Sides<T> | undefined, fallback: T): Record<Side, T> {
  return {
    top: resolveSide(v, 'top', fallback),
    right: resolveSide(v, 'right', fallback),
    bottom: resolveSide(v, 'bottom', fallback),
    left: resolveSide(v, 'left', fallback),
  };
}

/** `resolveAllSides` for `Widths` (numbers). Default fallback `0`. */
export function resolveWidths(w: Widths | undefined, fallback = 0): Record<Side, number> {
  return resolveAllSides(w, fallback);
}

/** `resolveAllSides` for `ColorsOnWidth` (strings). Default fallback `'#000'`. */
export function resolveColors(c: ColorsOnWidth | undefined, fallback = '#000'): Record<Side, string> {
  return resolveAllSides(c, fallback);
}

/**
 * Resolve `borderPatterns` per side. Not `resolveAllSides` — `BorderPatterns`
 * isn't a `Sides<number[]>` (see its doc comment): a flat `number[]` (one
 * pattern for every side) is disambiguated from a 2/4-element tuple of
 * patterns by inspecting the element type instead.
 */
export function resolvePatterns(p: BorderPatterns | undefined): Record<Side, number[] | undefined> {
  if (p === undefined) return { top: undefined, right: undefined, bottom: undefined, left: undefined };
  if (p.length === 0 || typeof p[0] === 'number') {
    const flat = p as number[];
    return { top: flat, right: flat, bottom: flat, left: flat };
  }
  const tuples = p as number[][];
  if (tuples.length === 2) {
    const [tb, lr] = tuples;
    return { top: tb, right: lr, bottom: tb, left: lr };
  }
  const [t, r, b, l] = tuples;
  return { top: t, right: r, bottom: b, left: l };
}

/** `resolveAllSides` for `borderShapes` (stroke-linecap). Default fallback `'butt'`. */
export function resolveShapes(s: Sides<BorderLineCap> | undefined, fallback: BorderLineCap = 'butt'): Record<Side, BorderLineCap> {
  return resolveAllSides(s, fallback);
}
