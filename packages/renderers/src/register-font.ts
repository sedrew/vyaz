/**
 * register-font.ts — one call that keeps the layout engine and the browser on
 * the *same* font.
 *
 * The engine measures with `@vyaz/core`'s `fontMetricsProvider`; a browser
 * paints the emitted `<svg><text>` with `document.fonts` / CSS. Those are two
 * registries — register a face with only one and the SVG drifts (glyphs land
 * under the wrong metrics). `registerFont` feeds both from a single source, and
 * is a no-op for the browser half outside a DOM.
 */
import { fontMetricsProvider } from '@vyaz/core';

export interface RegisterFontOptions {
  /** `'400'` / `'bold'` / `700` — defaults to `'normal'`. */
  weight?: string | number;
  style?: 'normal' | 'italic';
  /** Variable-font axis pin, e.g. `{ wght: 700 }`. */
  variation?: Record<string, number>;
  /** Register with the layout engine only; skip `document.fonts`. */
  engineOnly?: boolean;
}

export interface RegisterFontResult {
  family: string;
  /** Registered with `fontMetricsProvider` (the layout engine). */
  engine: boolean;
  /** Added to `document.fonts` (browser only; `false` in Node/Bun). */
  browser: boolean;
}

const CSS_GENERIC =
  /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-serif|ui-sans-serif|ui-monospace|ui-rounded|math|emoji|fangsong)$/i;

function normWeight(w: string | number | undefined): string {
  if (w == null) return 'normal';
  return typeof w === 'number' ? String(w) : w;
}

/**
 * Register one font face with the layout engine and (in a browser) with
 * `document.fonts`, from a single `ArrayBuffer` / `Uint8Array` or a URL.
 *
 * @example
 * ```ts
 * await registerFont('Inter', '/fonts/Inter.woff2', { weight: 400 })
 * await registerFont('Inter', bytes, { weight: 700, variation: { wght: 700 } })
 * ```
 */
export async function registerFont(
  family: string,
  source: ArrayBuffer | Uint8Array | string,
  opts: RegisterFontOptions = {},
): Promise<RegisterFontResult> {
  const weight = normWeight(opts.weight);
  const style = opts.style ?? 'normal';

  if (CSS_GENERIC.test(family)) {
    const proc: any = typeof globalThis !== 'undefined' ? (globalThis as any).process : undefined;
    if (proc?.env?.NODE_ENV !== 'production') {
      console.warn(
        `[vyaz] registerFont("${family}"): "${family}" is a CSS generic keyword. ` +
          'A browser paints `font-family="' + family + '"` with the OS default for that ' +
          'generic and ignores this @font-face, so the SVG will not match the metrics. ' +
          'Register under a concrete family name instead.',
      );
    }
  }

  // Fetch a URL once so both halves see identical bytes; normalise to a
  // Uint8Array (fontkit needs a typed array, not a bare ArrayBuffer).
  const bytes: Uint8Array =
    typeof source === 'string'
      ? new Uint8Array(await (await fetch(source)).arrayBuffer())
      : source instanceof Uint8Array
        ? source
        : new Uint8Array(source);

  await fontMetricsProvider.registerFont(
    family,
    { weight, style, ...(opts.variation ? { variation: opts.variation } : {}) },
    bytes,
  );

  let browser = false;
  if (!opts.engineOnly && typeof document !== 'undefined' && (document as any).fonts && typeof FontFace !== 'undefined') {
    try {
      // `bytes` is a fresh Uint8Array — a valid BufferSource at runtime; the cast
      // only sidesteps the generic-Uint8Array type friction in newer TS libs.
      const face = new FontFace(family, bytes as unknown as BufferSource, {
        weight: opts.variation ? '1 1000' : weight === 'normal' ? '400' : weight,
        style,
        display: 'swap',
      });
      await face.load();
      (document as any).fonts.add(face);
      browser = true;
    } catch {
      // bad bytes / FontFace unsupported — the engine half still stands
    }
  }

  return { family, engine: true, browser };
}
