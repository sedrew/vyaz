/**
 * FontTypes.ts — типы для шрифтовых метрик.
 *
 * Изоморфный слой: работает и в браузере (Canvas TextMetrics), и в Node.js (fontkit).
 *
 * Два режима:
 *   'browser' — использует hhea.ascender/descender (canvas fallback)
 *   'office'  — использует OS/2.usWinAscent/usWinDescent (как MS Office)
 */

/** Физические метрики шрифта (в пикселях для заданного fontSize) */
export interface FontMetrics {
  /** Подъём над baseline */
  ascent: number;
  /** Спуск под baseline (положительное число!) */
  descent: number;
  /** Высота заглавных букв */
  capHeight: number;
  /** UPM оригинального шрифта (для справки) */
  unitsPerEm: number;
  /**
   * Какая таблица шрифта использовалась для ascent/descent:
   *   'hhea'  — hhea.ascender/descender (браузерный режим)
   *   'OS/2'  — OS/2.usWinAscent/usWinDescent (Office-режим)
   *   'canvas' — canvas.measureText (браузерный fallback)
   *   'fallback' — эмпирическая формула
   */
  sourceTable?: 'hhea' | 'OS/2' | 'canvas' | 'fallback';
}

/** Провайдер метрик — изоморфный интерфейс */
export interface IFontMetricsProvider {
  /**
   * Установить режим измерения.
   *   'browser' — hhea.ascender/descender (по умолчанию)
   *   'office'  — OS/2.usWinAscent/usWinDescent
   */
  setMode(mode: 'browser' | 'office'): void;

  /**
   * Получить текущий режим.
   */
  getMode(): 'browser' | 'office';

  /**
   * Зарегистрировать бинарный шрифт для использования в fontkit.
   * В браузере — no-op (шрифты регистрируются через CSS @font-face).
   */
  registerFont(
    family: string,
    options: { weight?: string; style?: string },
    source: string | Buffer,
  ): void;

  /**
   * Получить метрики для заданного семейства и размера.
   */
  getMetrics(
    fontFamily: string,
    fontSize: number,
    weight?: string,
    style?: string,
  ): FontMetrics;
}

/** Glyph-level данные для одного глифа (для посимвольного трекинга/выделения) */
export interface GlyphData {
  char: string;            // символ
  advance: number;         // advance width в px
  x: number;              // позиция относительно начала строки
}