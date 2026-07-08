/**
 * Полифилл Canvas API для Bun/Node.js через @napi-rs/canvas.
 * Нужен для @chenglou/pretext в серверной среде (Bun/Node.js без DOM).
 *
 * Два уровня полифилла:
 *   1. globalThis.document.createElement('canvas') — pretext использует его
 *      внутри prepare() для создания временного Canvas и вызова measureText.
 *   2. OffscreenCanvas — для некоторых библиотек и ранних версий.
 *
 * Экспортирует enableOfficeTextMeasure / disableOfficeTextMeasure —
 * переопределение ctx.measureText для fontkit-измерений в Office-режиме.
 */
// ⚠️ Dynamic import — prevents esbuild from resolving @napi-rs/canvas at bundle time.
// This module is a native Node.js addon. In the browser, Canvas APIs are already available.
let _createCanvas: ((w: number, h: number) => any) | null = null;

try {
  // Dynamic require — kept as eval to avoid esbuild static analysis
  const mod: any = (Function('return require("@napi-rs/canvas")'))();
  _createCanvas = mod.createCanvas;
} catch {
  // Browser — document.createElement('canvas') is available natively, no polyfill needed
  _createCanvas = null;
}

// ── Полифилл document.createElement('canvas') ──────────────────────────
// Pretext внутри prepare() вызывает document.createElement('canvas'),
// чтобы создать временный Canvas и получить контекст 2d для measureText.
// Без этого полифилла prepare() падает с "document is not defined" в Bun.

if (typeof globalThis.document === 'undefined') {
  (globalThis as any).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas' && _createCanvas) return _createCanvas(1, 1);
      // Для других элементов — пустая заглушка
      return {};
    },
  };
}

// ── Полифилл OffscreenCanvas ───────────────────────────────────────────
// @napi-rs/canvas не предоставляет OffscreenCanvas, поэтому делаем шим.

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
 * Парсит ctx.font строку вида "italic bold 16px Arial" → { family, size, weight }
 */
function parseFont(fontStr: string): { family: string; size: number; weight: string } | null {
  // "italic bold 16px Arial" или "bold 16px Inter" или "16px Arial"
  const pxMatch = fontStr.match(/(\d+(?:\.\d+)?)px\s+(.+)/);
  if (!pxMatch) return null;
  const size = parseFloat(pxMatch[1]);
  // Упрощённо: всё после px — family
  const family = pxMatch[2].trim();
  // Парсим вес из начала
  const weightMatch = fontStr.match(/\b(bold|italic|\d{3})\b/);
  const weight = weightMatch ? (weightMatch[1] === 'bold' ? 'bold' : weightMatch[1]) : 'normal';
  return { family, size, weight };
}

/** Ключ кэша: "${family}_${weight}_normal" */
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
      // Fallback для отсутствующего глифа: используем оригинал
      if (originalMeasureText) {
        return originalMeasureText.call(this, text);
      }
      totalWidth += parsed.size * 0.5; // грубая оценка
    }
    // Пропускаем суррогатные пары
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
 * Включить Office-измерение: подменяет ctx.measureText на fontkit-based.
 * @param fontCache — Map ключ-шрифт из FontMetricsProvider
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
 * Восстановить оригинальный ctx.measureText.
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