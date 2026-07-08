/**
 * LayoutTypes.ts — выходные типы (Physical Box Model).
 *
 * ParagraphLayoutResult → LineBox[] → FragmentBox[]
 * Это контракт между layout engine и renderer'ами.
 *
 * Основан на plan.md §2.5 (Выход — Physical Box Model / Layout Tree)
 */

import type { TextRun, InlineWidget, TextAlignment } from './Document.js';

// ── FragmentBox (атом рендеринга) ──────────────────────────────────────

export interface FragmentBox {
  /** Смещение от LineBox.x */
  x: number;
  /** Физическая ширина фрагмента */
  width: number;
  /** Текст фрагмента (или " " для пробела при justify) */
  text: string;
  /** Index of the source run in the paragraph's `children` array. */
  itemIndex: number;
  /** ID of the source paragraph (for SVG grouping). */
  paragraphId?: string;

  /** Физические метрики шрифта для этого фрагмента */
  fontMetrics: FragmentFontMetrics;

  /**
   * A snapshot of the source run's style at layout time.
   * Copied from the corresponding `TextRun` in the paragraph's `children` array.
   */
  style: TextRun;

  /** InlineWidget данные (если фрагмент — inline-box) */
  inlineWidget?: InlineWidget;

  /** Посимвольные advance widths (для выделения/трекинга) */
  glyphAdvances?: number[];

  /** Тип фрагмента: 'text' — обычный текст, 'space' — пробельный фрагмент */
  type: 'text' | 'space';

  /**
   * Признак концевого пробела (trailing whitespace).
   * - true: фрагмент находится в конце строки, не участвует в advance строки
   *         и не растягивается при justify (нулевая ширина для расчётов).
   * - undefined/false: обычный фрагмент.
   *
   * См. CSS Text Module Level 3 §4.1.3 (Tracking and Dropping Spaces)
   * и Parley LineItemData::has_trailing_whitespace.
   */
  trailing?: boolean;

  /**
   * Режим разрыва строки после этого фрагмента.
   * 'soft' — перенос по мягкому разрыву (не хватает места)
   * 'hard' — принудительный разрыв (\n, явный разделитель)
   * undefined — не конец строки
   */
  breakType?: 'soft' | 'hard';
}

export interface FragmentFontMetrics {
  ascent: number;
  descent: number;
  fontSize: number;
}

// ── LineBox (строка) ───────────────────────────────────────────────────

export interface LineBox {
  /** Абсолютный X в контейнере (alignment + indent) */
  x: number;
  /** Абсолютный Y верхней границы строки */
  y: number;
  /** Ширина контента строки (без выравнивания) */
  width: number;
  /** Полная высота строки (max фрагментов × lineHeight) */
  height: number;

  /** Смещение baseline от y */
  baseline: number;
  /** Максимальный подъём в строке */
  ascent: number;
  /** Максимальный спуск в строке */
  descent: number;

  /** Индекс первого символа в исходном тексте параграфа */
  startIndex: number;
  /** Индекс последнего символа + 1 (для удобства подсчёта длины) */
  endIndex: number;

  /** Выравнивание параграфа (опционально, для PowerPoint рендера) */
  alignment?: TextAlignment;

  fragments: FragmentBox[];
}

// ── ParagraphLayoutResult (один параграф) ──────────────────────────────

export interface ParagraphLayoutResult {
  width: number;             // ширина параграфа (maxWidth)
  height: number;            // полная высота параграфа с отступами
  lines: LineBox[];
  /** Реальная ширина контента (bbox текста, без пустот) */
  contentWidth: number;
  /** Реальная высота контента (bbox текста) */
  contentHeight: number;
}

// ── Текстовый регион для YAML-снепшотов ────────────────────────────────

/** Семантический фрагмент для снепшотов (без физических метрик) */
export interface SemanticFragment {
  text: string;
  x: number;
  width: number;
  style?: 'bold' | 'italic' | 'normal';
}

/** Семантическая строка для снепшотов */
export interface SemanticLine {
  y: number;
  width: number;
  height: number;
  baseline: number;
  fragments: SemanticFragment[];
}

/** Семантический параграф для YAML-снепшотов */
export interface SemanticParagraph {
  width: number;
  height: number;
  lines: SemanticLine[];
}