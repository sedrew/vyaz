/**
 * Canvas API polyfill for Bun/Node.js via @napi-rs/canvas.
 * Required by @chenglou/pretext in server environments (Bun/Node.js without DOM).
 *
 * Two levels of polyfill:
 *   1. globalThis.document.createElement('canvas') — pretext uses this
 *      inside prepare() to create a temporary Canvas and call measureText.
 *   2. OffscreenCanvas — for some libraries and early versions.
 *
 * Exports enableOfficeTextMeasure / disableOfficeTextMeasure —
 * ctx.measureText override for fontkit-based measurements in Office mode.
 *
 * ⚠️ All Node.js built-in module imports are dynamic (lazy) to avoid
 * Vite/Webpack externalization errors in browser builds.
 */

// ── Lazy Node.js module loader ─────────────────────────────────────
// Dynamic import('module') — hidden from bundler static analysis.
// Only resolves on Node.js / Bun.  No-op in browser.
// Use 'any' for process to avoid requiring @types/node in browser contexts.
const _process: any = typeof globalThis !== 'undefined'
  ? (globalThis as any).process
  : undefined;

let _require: ((id: string) => any) | null = null;
let _createCanvas: ((w: number, h: number) => any) | null = null;

async function _initNodeDeps(): Promise<void> {
  try {
    // @ts-ignore — 'module' is a Node.js built-in; not resolvable with moduleResolution:bundler.
    // This dynamic import is guarded by a runtime check and never executes in browser.
    const m: any = await import('module');
    _require = m.createRequire(import.meta.url);
    const canvas: any = _require!('@napi-rs/canvas');
    _createCanvas = canvas.createCanvas;
  } catch {
    // Browser or server without @napi-rs/canvas
    _createCanvas = null;
  }
}

// ESM top-level await — guarded by runtime check so bundlers don't
// attempt to resolve 'module' at compile time.
if (_process && (_process.versions?.node || _process.versions?.bun)) {
  await _initNodeDeps();
}

// ── Polyfill document.createElement('canvas') ────────────────────────────
// Pretext internally calls document.createElement('canvas') during prepare(),
// to create a temporary Canvas and obtain a 2d context for measureText.
// Without this polyfill, prepare() crashes with "document is not defined" in Bun.

function needsCanvasPolyfill(): boolean {
  if (typeof globalThis.document === 'undefined') return true;
  try {
    const el = globalThis.document.createElement('canvas');
    if (!el || typeof el.getContext !== 'function') return true;
    return false;
  } catch {
    return true;
  }
}

if (needsCanvasPolyfill()) {
  (globalThis as any).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas' && _createCanvas) return _createCanvas(1, 1);
      // For other elements — empty stub
      return {};
    },
  };
}

// ── Polyfill OffscreenCanvas ─────────────────────────────────────────────
// @napi-rs/canvas does not provide OffscreenCanvas, so we create a shim.

if (typeof globalThis.OffscreenCanvas === 'undefined' && _createCanvas) {
  (globalThis as any).OffscreenCanvas = class OffscreenCanvasShim {
    private _canvas: any;
    private _w: number;
    private _h: number;

    constructor(width: number, height: number) {
      this._w = width;
      this._h = height;
      this._canvas = _createCanvas!(width, height);
    }

    get width(): number { return this._w; }
    set width(v: number) { this._w = v; this._canvas.width = v; }
    get height(): number { return this._h; }
    set height(v: number) { this._h = v; this._canvas.height = v; }

    getContext(type: string, attrs?: any): any {
      return this._canvas.getContext(type, attrs);
    }

    async convertToBlob({ type: _type }: { type?: string } = {}): Promise<Blob> {
      // @napi-rs/canvas toBuffer always returns PNG buffer
      const buffer = this._canvas.toBuffer('image/png');
      return new Blob([buffer], { type: 'image/png' });
    }
  };
}

// ── Office measureText override ─────────────────────────────────────

const originalMeasureText = (globalThis as any).CanvasRenderingContext2D
  ?.prototype?.measureText as
  | ((text: string) => TextMetrics)
  | undefined;

/** fontCache: Map<family_weight_style, fontkit.Font> */
let officeFontCache: Map<string, any> | null = null;
let officeEnabled = false;

/**
 * Parse ctx.font string like "italic bold 16px Arial" → { family, size, weight }
 */
function parseFont(fontStr: string): { family: string; size: number; weight: string } | null {
  // "italic bold 16px Arial" or "bold 16px Inter" or "16px Arial"
  const pxMatch = fontStr.match(/(\d+(?:\.\d+)?)px\s+(.+)/);
  if (!pxMatch) return null;
  const size = parseFloat(pxMatch[1]);
  // Simplified: everything after px is the family
  const family = pxMatch[2].trim();
  // Parse weight from beginning
  const weightMatch = fontStr.match(/\b(bold|italic|\d{3})\b/);
  const weight = weightMatch ? (weightMatch[1] === 'bold' ? 'bold' : weightMatch[1]) : 'normal';
  return { family, size, weight };
}

/** Cache key: "${family}_${weight}_normal" */
function cacheKey(family: string, weight: string): string {
  return `${family}_${weight}_normal`;
}

function officeMeasureText(this: any, text: string): TextMetrics {
  if (!officeFontCache) {
    return originalMeasureText?.call(this, text) ?? createEmptyMetrics();
  }

  const parsed = parseFont(this.font);
  if (!parsed) {
    return originalMeasureText?.call(this, text) ?? createEmptyMetrics();
  }

  const key = cacheKey(parsed.family, parsed.weight);
  const font = officeFontCache.get(key);
  if (!font) {
    return originalMeasureText?.call(this, text) ?? createEmptyMetrics();
  }

  const scale = parsed.size / font.unitsPerEm;
  let totalWidth = 0;

  for (let i = 0; i < text.length; i++) {
    const codePoint = text.codePointAt(i)!;
    const glyph = font.glyphForCodePoint(codePoint);
    if (glyph) {
      totalWidth += glyph.advanceWidth * scale;
    } else {
      // Fallback for missing glyph: use original
      if (originalMeasureText) {
        return originalMeasureText.call(this, text);
      }
      totalWidth += parsed.size * 0.5; // rough estimate
    }
    // Skip surrogate pairs
    if (codePoint > 0xffff) i++;
  }

  return createMetricsObject(totalWidth);
}

function createMetricsObject(width: number): TextMetrics {
  return {
    width,
    actualBoundingBoxAscent: 0,
    actualBoundingBoxDescent: 0,
    fontBoundingBoxAscent: 0,
    fontBoundingBoxDescent: 0,
    actualBoundingBoxLeft: 0,
    actualBoundingBoxRight: width,
  } as unknown as TextMetrics;
}

function createEmptyMetrics(): TextMetrics {
  return createMetricsObject(0);
}

/**
 * Register a font with @napi-rs/canvas so ctx.measureText() works in Node.js.
 * No-op in browser or when @napi-rs/canvas is not available.
 */
export function registerCanvasFont(fontPath: string, family: string): void {
  if (!_require) return; // @napi-rs/canvas not available
  try {
    const mod = _require('@napi-rs/canvas');
    if (mod?.registerFont) {
      mod.registerFont(fontPath, { family });
    }
  } catch {
    // @napi-rs/canvas not available — no-op
  }
}

/**
 * Enable Office measurement: replaces ctx.measureText with fontkit-based version.
 * @param fontCache — Map key->font from FontMetricsProvider
 */
export function enableOfficeTextMeasure(fontCache: Map<string, any>): void {
  if (officeEnabled) return;
  officeFontCache = fontCache;
  officeEnabled = true;

  const CtxProto = (globalThis as any).CanvasRenderingContext2D?.prototype;
  if (CtxProto && originalMeasureText) {
    CtxProto.measureText = officeMeasureText;
  }
}

/**
 * Restore original ctx.measureText.
 */
export function disableOfficeTextMeasure(): void {
  if (!officeEnabled) return;
  officeEnabled = false;
  officeFontCache = null;

  const CtxProto = (globalThis as any).CanvasRenderingContext2D?.prototype;
  if (CtxProto && originalMeasureText) {
    CtxProto.measureText = originalMeasureText;
  }
}