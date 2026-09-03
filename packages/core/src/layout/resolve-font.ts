/**
 * resolve-font.ts — turn a `fontFamily` (single name or CSS-style fallback
 * list) into one concrete registered family, per the `onMissingFont` policy.
 *
 * Everything downstream (positioning, rendering) sees a plain string.
 */
import type { FontFace } from '../measure/FontEngine.js';
import { FontNotFoundError } from '../measure/FontNotFoundError.js';
import type { LayoutWarning } from '../types/LayoutTypes.js';

/** How to react when none of a run's requested families are registered. */
export type OnMissingFont = 'throw' | 'substitute';

/** Minimal provider surface this module needs. */
export interface FontResolverLike {
  getFont(family: string, weight?: string, style?: string): FontFace | undefined;
  getRegisteredFamilies(): string[];
}

export interface ResolvedFamily {
  family: string;
  warning: Omit<LayoutWarning, 'runIndex'> | null;
}

/**
 * @param family      run's `fontFamily`: a name, or a fallback list
 * @param onMissing   policy when nothing matches (default `'throw'`)
 */
export function resolveFontFamily(
  provider: FontResolverLike,
  family: string | string[],
  weight: string,
  style: string,
  onMissing: OnMissingFont = 'throw',
): ResolvedFamily {
  const list = Array.isArray(family) ? family : [family];
  const primary = list[0] ?? '';

  for (let i = 0; i < list.length; i++) {
    if (provider.getFont(list[i], weight, style)) {
      return {
        family: list[i],
        warning: i === 0 ? null : { type: 'font-fallback', requested: primary, used: list[i] },
      };
    }
  }

  if (onMissing === 'throw') {
    throw new FontNotFoundError(primary, weight, style);
  }

  // substitute: use any registered family, else there is nothing to fall back to
  const any = provider.getRegisteredFamilies()[0];
  if (!any) throw new FontNotFoundError(primary, weight, style);
  return { family: any, warning: { type: 'font-missing', requested: primary, used: any } };
}
