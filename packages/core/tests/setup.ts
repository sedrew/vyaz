/**
 * bun test setup — как parley `load_fonts()` + `create_font_context()`.
 *
 * 1. Полифилл OffscreenCanvas / document для @chenglou/pretext
 * 2. Загрузка всех шрифтов из tests/fonts/ (аналог parley_dev/assets/fonts/)
 */

import { createCanvas } from '@napi-rs/canvas';
import { fontMetricsProvider } from '../src/measure/FontMetricsProvider.js';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── OffscreenCanvas polyfill ─────────────────────────────────────────────
// Pretext пытается создать OffscreenCanvas первым.

if (typeof globalThis.OffscreenCanvas === 'undefined') {
  (globalThis as any).OffscreenCanvas = class OffscreenCanvasShim {
    private _canvas: any;
    private _w: number;
    private _h: number;

    constructor(width: number, height: number) {
      this._w = width;
      this._h = height;
      this._canvas = createCanvas(width, height);
    }

    get width(): number { return this._w; }
    set width(v: number) { this._w = v; this._canvas.width = v; }
    get height(): number { return this._h; }
    set height(v: number) { this._h = v; this._canvas.height = v; }

    getContext(type: string, attrs?: any): any {
      return this._canvas.getContext(type, attrs);
    }

    async convertToBlob({ type: _type }: { type?: string } = {}): Promise<Blob> {
      const buffer = this._canvas.toBuffer('image/png');
      return new Blob([buffer], { type: 'image/png' });
    }
  };
}

// ── document.createElement('canvas') fallback ────────────────────────────

if (typeof globalThis.document === 'undefined') {
  (globalThis as any).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') return createCanvas(1, 1);
      return {};
    },
  };
}

// ── Load all fonts from tests/fonts/ (parley-style) ──────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FONTS_DIR = resolve(__dirname, 'fonts');

const fontFiles = readdirSync(FONTS_DIR).filter((f) =>
  /\.(ttf|otf|ttc|otc)$/i.test(f),
);

for (const file of fontFiles) {
  const buffer = readFileSync(resolve(FONTS_DIR, file));
  // Используем имя файла без расширения как family name
  const familyName = file.replace(/\.\w+$/, '');
  await fontMetricsProvider.registerFont(
    familyName,
    { weight: '400', style: 'normal' },
    buffer,
  );
}