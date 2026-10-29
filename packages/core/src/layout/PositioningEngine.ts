/**
 * PositioningEngine.ts — pure X/Y positioning math.
 *
 * Takes pretext output (spans with fragments) + font metrics +
 * paragraph style → returns Line[] with absolute coordinates.
 *
 * X: alignment (left/center/right/justify) + indent
 * Y: baseline + lineHeight + spaceBefore/After
 * Justify: fragmented approach (each space → separate Span)
 *
 * Specs:
 * - CSS Text Module Level 3/4 (browser mode)
 * - ISO/IEC 29500 (Office Open XML / DrawingML, office mode)
 * - Parley alignment.rs (conceptually close, but here justify is simpler:
 *   slack is divided equally among stretchable space-spans,
 *   without mutating ClusterData.advance)
 */

import type { ParagraphStyle, ListStyle, NumberFormat } from '../types/Document.js';
import type { FontMetrics } from '../types/FontTypes.js';
import type { Line, LineDecoration, Span, SpanFontMetrics } from '../types/LayoutTypes.js';
import type { PreparedRichInlineItem } from '../compile/ParagraphCompiler.js';
import { formatListNumber, defaultBulletChar } from '../utils/list.js';

// ── Helper types for pretext ───────────────────────────────────────────

interface PretextFragment {
  itemIndex: number;
  text: string;
  gapBefore: number;
  /** Item whose collapsed space `gapBefore` measures, or -1 when no space precedes the fragment. */
  gapItemIndex: number;
  occupiedWidth: number;
}

interface PretextLine {
  fragments: PretextFragment[];
  width: number;         // natural width (without stretching)
}

// ── List marker helpers ─────────────────────────────────────────────────

/**
 * Resolve the marker text for a list item.
 */
function getMarkerText(listStyle: ListStyle, listIndex: number): string {
  if (listStyle.type === 'bullet') {
    return listStyle.bulletChar ?? defaultBulletChar(listStyle.level ?? 0);
  }
  if (listStyle.type === 'number') {
    const fmt = listStyle.numberFormat ?? 'decimal';
    return formatListNumber(listIndex, fmt) + '.';
  }
  return '';
}

/**
 * Resolve the paragraph-level font size for marker sizing.
 * Uses the first child run's fontSize, or DEFAULT_TEXT_STYLE.fontSize.
 */
function getParagraphFontSize(items: PreparedRichInlineItem[]): number {
  if (items.length === 0) return 12;
  return items[0].metadata.style.fontSize ?? 12;
}

/**
 * Resolve the effective bulletIndent for a paragraph.
 * Uses listStyle.indents[level] if available, otherwise default * (level + 1).
 */
function resolveBulletIndent(
  listStyle: ListStyle,
  paraFontSize: number,
): number {
  const level = listStyle.level ?? 0;
  const indents = listStyle.indents;
  if (indents && indents[level] !== undefined) {
    return indents[level];
  }
  const defaultIndent = listStyle.bulletIndent ?? (paraFontSize * 1.5);
  return defaultIndent * (level + 1);
}

/**
 * Marker font size relative to the paragraph's first run. PowerPoint draws
 * bullets and numbers at 100 % (× `buSzPct`); vyaz's browser bullet has
 * always been 0.9×.
 */
function markerSizeFactor(listStyle: ListStyle, mode: 'browser' | 'office'): number {
  if (listStyle.bulletSize !== undefined) return listStyle.bulletSize;
  return listStyle.type === 'bullet' && mode === 'browser' ? 0.9 : 1;
}

/** Context for one line-break-free piece of a paragraph — see {@link positionLines}. */
export interface PositionExtras {
  /**
   * Justify the piece's last line too: it ends in a `\n` that is not the
   * paragraph's end (`mode: 'office'` — PowerPoint stretches a line ending in
   * `<a:br/>`; CSS does not).
   */
  justifyLastLine?: boolean;
  /** List paragraph continued after a `\n`: indent like a list item, draw no marker. */
  noMarker?: boolean;
  /** The single pretext line is a synthetic empty one: emit a zero-width strut span for the first run. */
  strut?: boolean;
}

/** Collapsible whitespace inside a span, for justify splitting. */
const SPACE_RUN_RE = /[ \t\f\r]+/g;

/**
 * Split each text span that contains spaces into text / space spans, so every
 * space can take its share of justify slack (PowerPoint and CSS stretch every
 * space of the line, not only those between runs).
 */
function splitSpacesForJustify(
  spans: Span[],
  measureText: (text: string, fontSize: number, fontFamily?: string, fontWeight?: string, fontStyle?: string) => number,
  metricsOf: Map<Span, FontMetrics>,
): Span[] {
  const out: Span[] = [];
  for (const span of spans) {
    if (span.type !== 'text' || span.inlineWidget || !/[ \t\f\r]/.test(span.text)) { out.push(span); continue; }
    const { fontFamily, fontWeight, fontStyle } = span.style;
    const w = String(fontWeight || 400);
    const st = fontStyle || 'normal';
    const pieces: Span[] = [];
    let last = 0;
    for (const m of span.text.matchAll(SPACE_RUN_RE)) {
      if (m.index! > last) pieces.push({ ...span, text: span.text.slice(last, m.index), type: 'text' });
      pieces.push({ ...span, text: m[0], type: 'space' });
      last = m.index! + m[0].length;
    }
    if (last < span.text.length) pieces.push({ ...span, text: span.text.slice(last), type: 'text' });
    const tracking = span.style.letterSpacing ?? 0;
    let sum = 0;
    for (const piece of pieces) {
      piece.width = measureText(piece.text, span.fontMetrics.fontSize, fontFamily, w, st) + tracking * [...piece.text].length;
      sum += piece.width;
    }
    // keep the span's own width: shaped / quantized widths of the pieces may not add up exactly
    if (pieces.length > 0) pieces[pieces.length - 1].width += span.width - sum;
    const metrics = metricsOf.get(span);
    if (metrics) for (const piece of pieces) metricsOf.set(piece, metrics);
    out.push(...pieces);
  }
  return out;
}

/**
 * `mode: 'office'` underline / strikethrough rules, PowerPoint's model
 * (scripts/office-metrics/TEXT-FEATURES-RESULTS.md §5, measured 8–144 pt):
 *
 * - underline: one rule per contiguous underlined stretch of the line (same
 *   colour), top at `baseline + underlineTop`, thickness `underlineThickness`,
 *   both the run-advance-weighted average over the stretch (`post` table);
 * - strikethrough: one rule per run, at that run's own `OS/2` strikeout;
 * - trailing spaces at the line end carry none.
 */
function officeDecorations(
  spans: Span[],
  metricsOf: Map<Span, FontMetrics>,
  baseline: number,
): LineDecoration[] {
  const out: LineDecoration[] = [];
  const color = (s: Span) => s.style.color ?? '#000000';
  const uTop = (s: Span) => metricsOf.get(s)?.underlineTop ?? s.fontMetrics.fontSize * 0.1;
  const uThick = (s: Span) => metricsOf.get(s)?.underlineThickness ?? s.fontMetrics.fontSize * 0.05;
  const kTop = (s: Span) => metricsOf.get(s)?.strikeoutTop ?? -s.fontMetrics.fontSize * 0.26;
  const kThick = (s: Span) => metricsOf.get(s)?.strikeoutThickness ?? s.fontMetrics.fontSize * 0.05;
  const painted = spans.filter((s) => s.type !== 'marker' && !s.trailing && !s.inlineWidget);

  for (let i = 0; i < painted.length;) {
    const first = painted[i];
    if (!first.style.underline) { i++; continue; }
    let j = i;
    while (j + 1 < painted.length && painted[j + 1].style.underline && color(painted[j + 1]) === color(first)) j++;
    let w = 0, top = 0, thick = 0;
    for (let k = i; k <= j; k++) {
      const s = painted[k];
      const sw = Math.max(s.width, 1e-6);
      w += sw; top += sw * uTop(s); thick += sw * uThick(s);
    }
    const last = painted[j];
    out.push({ kind: 'underline', x: first.x, width: round2(last.x + last.width - first.x), y: round2(baseline + top / w), thickness: round2(thick / w), color: color(first) });
    i = j + 1;
  }
  for (let i = 0; i < painted.length;) {
    const first = painted[i];
    if (!first.style.strikethrough) { i++; continue; }
    let j = i;
    while (j + 1 < painted.length && painted[j + 1].style.strikethrough && painted[j + 1].itemIndex === first.itemIndex) j++;
    const last = painted[j];
    out.push({ kind: 'strikethrough', x: first.x, width: round2(last.x + last.width - first.x), y: round2(baseline + kTop(first)), thickness: round2(kThick(first)), color: color(first) });
    i = j + 1;
  }
  return out;
}

function hasDecoration(spans: Span[]): boolean {
  for (const s of spans) if (s.style.underline || s.style.strikethrough) return true;
  return false;
}

// ── PositioningEngine ─────────────────────────────────────────────────

/**
 * `mode: 'office'` line box = `OFFICE_LINE_BOX_RATIO × maxFontSizeInLine ×
 * style.lineHeight`. The 1.20 is **font-independent** — PowerPoint's own SVG
 * exports (packages/renderers/tests/office-cases/) put the pitch at exactly
 * `spcPct × 1.20 × fontSize` for Roboto, and `scripts/office-metrics/RESULTS.md`
 * gets the same 1.20 box for Great Vibes (OS/2 win ratio 1.75). No single
 * fontkit metric (win / hhea / typo) yields 1.20 for both, so this is a
 * measured constant, not a table lookup. Alternative under consideration:
 * `max(1.20, hheaLineHeight / upm)` — needs a large-`hhea` display font in the
 * oracle to tell apart (Roboto hhea/upm = 1.17 < 1.20, so it can't here).
 */
const OFFICE_LINE_BOX_RATIO = 1.20;

/**
 * `mode: 'office'` — fallback fraction of the line box that sits above the
 * baseline, used at `style.lineHeight !== 1` (flat 0.75 there matches real
 * PowerPoint within ~0.2pt for every spcPct tested: 125/150/175/200%), and
 * as the last-resort fallback at `style.lineHeight === 1` when the dominant
 * run's font has no usable OS/2 table, or sets `fsSelection.useTypoMetrics`
 * (only one such font tested — Unifont — not enough to derive its own rule).
 *
 * At `style.lineHeight === 1` with a normal (non-`useTypoMetrics`) OS/2
 * table, this constant is **not** used — see the `baselineRatio` computation
 * below, the dominant run's own `winAscFrac` instead: PowerPoint fills the
 * line box with the font's win box scaled to fit (7 fonts × 6–9 sizes,
 * scripts/office-metrics/TEXT-FEATURES-RESULTS.md "Baseline at spcPct 100 %").
 */
const OFFICE_BASELINE_RATIO = 0.75;

/**
 * `mode: 'browser'` — the pixel grid Chrome rounds font ascent/descent to, in
 * device px per CSS px. 1 matches headless Chromium (any `deviceScaleFactor`)
 * and desktop Chrome at 100%; a Blink that lays out at device scale (Electron
 * at DPR 2) rounds to 0.5px instead.
 */
const BROWSER_PIXEL_GRID = 1;

/** Blink's `LayoutUnit`: fixed point, 1/64 px. */
const LAYOUT_UNIT = 64;

/** One inline box on a line: font metrics (px), used size, and its baseline shift (+ = down). */
interface BrowserInlineBox {
  ascent: number;
  descent: number;
  fontSize: number;
  shift: number;
  /** Atomic inline (an inline-box widget, like `<img>`): its box is exactly ascent + descent — no leading, no rounding. */
  atomic?: boolean;
}

/**
 * `mode: 'browser'` line box — CSS 2.1 §10.8 as Blink computes it, measured
 * against Chrome over 10 fonts × 17 sizes × 7 line-heights (1190/1190 exact
 * for height, baseline and 3-line pitch):
 *
 * - each inline box's ascent/descent (hhea) is rounded to the pixel grid;
 * - its line-height is `fontSize × lineHeight` floored to a LayoutUnit;
 * - half-leading = `(lineHeight − (A + D)) / 2` truncated to a LayoutUnit — it
 *   may be **negative** (the glyphs overflow the box; the line never grows to
 *   fit them);
 * - the box's baseline sits `floor(A + halfLeading)` below its top, on the
 *   pixel grid; the rest of the box (`lineHeight − that`) hangs below it;
 * - the line box spans the highest box top to the lowest box bottom (mixed
 *   sizes: 144/144 exact against Chrome).
 *
 * An atomic inline (inline-box widget) contributes its own box as-is.
 */
function browserLineBox(boxes: BrowserInlineBox[], lineHeight: number): { height: number; baseline: number } {
  const grid = BROWSER_PIXEL_GRID;
  const lu = (v: number) => Math.floor(v * LAYOUT_UNIT) / LAYOUT_UNIT;
  let above = -Infinity;
  let below = -Infinity;
  for (const b of boxes) {
    if (b.atomic) {
      above = Math.max(above, b.ascent - b.shift);
      below = Math.max(below, b.descent + b.shift);
      continue;
    }
    const a = Math.round(b.ascent * grid) / grid;
    const d = Math.round(b.descent * grid) / grid;
    const boxHeight = lu(lu(b.fontSize) * lineHeight);
    const halfLeading = Math.trunc(((boxHeight - (a + d)) / 2) * LAYOUT_UNIT) / LAYOUT_UNIT;
    const boxAbove = Math.floor((a + halfLeading) * grid) / grid;
    above = Math.max(above, boxAbove - b.shift);
    below = Math.max(below, boxHeight - boxAbove + b.shift);
  }
  if (!Number.isFinite(above)) return { height: 0, baseline: 0 };
  return { height: above + below, baseline: above };
}

/** Round to 2 decimal places — the precision every emitted geometry value carries. */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Marker text, size and the indents it puts on the paragraph's lines. */
export interface ListMarkerLayout {
  isListItem: boolean;
  markerText: string;
  markerWidth: number;
  markerFontSize: number;
  markerFontFamily: string;
  /** Width of the marker zone (outside markers). */
  bulletZoneIndent: number;
  /** Left edge of every line's text: `leftIndent` + the outside marker zone. */
  effectiveLeftIndent: number;
  /** office: extra first-line indent when the marker is wider than its zone. */
  firstLineMarkerOverflow: number;
}

/**
 * Resolve a paragraph's list marker and the left indents that follow from
 * it — shared by `positionLines` (where each line goes) and line breaking
 * (how wide each line may be), so the two always agree.
 */
export function resolveListMarker(
  items: PreparedRichInlineItem[],
  style: ParagraphStyle,
  mode: 'browser' | 'office',
  measureText: (text: string, fontSize: number, fontFamily?: string, fontWeight?: string, fontStyle?: string) => number,
  listStyle?: ListStyle,
  listIndex?: number,
  listMarkerWidth?: number,
  extras: PositionExtras = {},
): ListMarkerLayout {
  const isListItem = !!listStyle && listStyle.type !== 'none' && listIndex !== undefined;
  let markerText = '';
  let markerWidth = 0;
  let markerFontSize = 0;
  let markerFontFamily = 'Arial';
  let bulletZoneIndent = 0;
  let effectiveLeftIndent = style.leftIndent ?? 0;
  // office: the first line's text starts after the marker when the marker is
  // wider than the hanging indent (PowerPoint, per paragraph — no list-wide
  // alignment); continuation lines stay at the hanging indent.
  let firstLineMarkerOverflow = 0;

  if (isListItem) {
    markerText = getMarkerText(listStyle!, listIndex!);
    const paraFontSize = getParagraphFontSize(items);
    bulletZoneIndent = resolveBulletIndent(listStyle!, paraFontSize);

    // browser: expand bulletIndent to fit the widest marker in the list group
    if (mode === 'browser' && listMarkerWidth !== undefined && listMarkerWidth > bulletZoneIndent) {
      bulletZoneIndent = listMarkerWidth;
    }

    // Marker font: `bulletFont`, else the paragraph's first run's font.
    markerFontFamily = listStyle!.bulletFont ?? items[0]?.metadata.style.fontFamily ?? 'Arial';
    const firstRunFontWeight = String(items[0]?.metadata.style.fontWeight ?? 400);
    const firstRunFontStyle = items[0]?.metadata.style.fontStyle ?? 'normal';

    markerFontSize = paraFontSize * markerSizeFactor(listStyle!, mode);
    // office: PowerPoint does not kern an auto-number ("11." is two whole "1"s).
    markerWidth = mode === 'office'
      ? [...markerText].reduce((w, ch) => w + measureText(ch, markerFontSize, markerFontFamily, firstRunFontWeight, firstRunFontStyle), 0)
      : measureText(markerText, markerFontSize, markerFontFamily, firstRunFontWeight, firstRunFontStyle);

    // For 'outside': text block is shifted right by bulletZoneIndent
    if (listStyle!.position !== 'inside') {
      effectiveLeftIndent += bulletZoneIndent;
      if (mode === 'office' && !extras.noMarker) firstLineMarkerOverflow = Math.max(0, markerWidth - bulletZoneIndent);
    }
  }

  return { isListItem, markerText, markerWidth, markerFontSize, markerFontFamily, bulletZoneIndent, effectiveLeftIndent, firstLineMarkerOverflow };
}

/**
 * How far in from each side a paragraph's lines start: the first line of a
 * piece (`style.indent`, an office marker wider than its zone, an inside
 * marker and its gap) and every other line; `right` is `style.rightIndent`.
 * Line breaking narrows each line by these, positioning moves it by them.
 */
export function paragraphLineIndents(
  marker: ListMarkerLayout,
  style: ParagraphStyle,
  listStyle?: ListStyle,
  extras: PositionExtras = {},
): { first: number; rest: number; right: number } {
  const insideMarker = marker.isListItem && !extras.noMarker && listStyle?.position === 'inside'
    ? marker.markerWidth + marker.markerFontSize * 0.5
    : 0;
  return {
    first: marker.effectiveLeftIndent + (style.indent || 0) + marker.firstLineMarkerOverflow + insideMarker,
    rest: marker.effectiveLeftIndent,
    right: style.rightIndent || 0,
  };
}

/**
 * Build Line[] from pretext lines with alignment and metrics.
 *
 * @param pretextLines — pretext result (materializeRichInlineLineRange)
 * @param items — original PreparedRichInlineItem[] (for metadata)
 * @param fontMetricsFn — function to get font metrics for a span
 * @param style — paragraph style
 * @param maxWidth — available container width
 * @param startY — initial Y position
 * @param mode — metric mode ('browser' | 'office'), affects line height calculation
 * @param tag — optional tag for debugging
 * @param measureText — function to measure text width accurately via fontkit.
 *   The function accepts (text, fontSize, fontFamily, fontWeight, fontStyle)
 *   and returns width in px. Throws FontNotFoundError if font not registered.
 * @param listStyle — optional list configuration (bullet / numbered)
 * @param listIndex — current index in the list (for numbered lists). 1-based.
 * @param listMarkerWidth — pre-computed width of the widest marker in the list group.
 *   When provided, bulletIndent is expanded to this value if needed.
 * @returns { lines: Line[], contentWidth: number }
 */
export function positionLines(
  pretextLines: PretextLine[],
  items: PreparedRichInlineItem[],
  fontMetricsFn: (item: PreparedRichInlineItem) => FontMetrics,
  style: ParagraphStyle,
  maxWidth: number,
  startY: number = 0,
  mode: 'browser' | 'office' = 'browser',
  measureText: (text: string, fontSize: number, fontFamily?: string, fontWeight?: string, fontStyle?: string) => number,
  tag?: string,
  listStyle?: ListStyle,
  listIndex?: number,
  listMarkerWidth?: number,
  extras: PositionExtras = {},
): { lines: Line[]; contentWidth: number } {
  const lines: Line[] = [];
  let currentY = startY + style.spaceBefore;
  let charIndex = 0;
  let isFirstLine = true;
  let contentWidth = 0;

  // ── Pre-compute marker-related values ──────────────────────────
  const {
    isListItem, markerText, markerWidth, markerFontSize, markerFontFamily,
    bulletZoneIndent, effectiveLeftIndent, firstLineMarkerOverflow,
  } = resolveListMarker(items, style, mode, measureText, listStyle, listIndex, listMarkerWidth, extras);

  for (let lineIdx = 0; lineIdx < pretextLines.length; lineIdx++) {
    const ptLine = pretextLines[lineIdx];

    // ── Build Span[] ────────────────────────────
    let maxAscent = 0;
    let maxDescent = 0;
    // Track alongside maxAscent/maxDescent: the OS/2 ratios belonging to
    // whichever item carries this line's largest fontSize — same "dominant
    // run" `maxFontSize` picks below for lineBoxHeight. Only consumed by
    // `mode: 'office'` at `style.lineHeight === 1` (see OFFICE_BASELINE_RATIO).
    let maxFontSizeSeen = 0;
    let dominantTypoAscFrac: number | undefined;
    let dominantWinAscFrac: number | undefined;
    let dominantUseTypoMetrics: boolean | undefined;
    let spans: Span[] = [];
    const inlineBoxes: BrowserInlineBox[] = [];
    const metricsOf = new Map<Span, FontMetrics>();

    // A strut line (empty paragraph / piece) has no fragments: lay out one
    // empty fragment of the first run so the line takes that run's size.
    const fragments: PretextFragment[] = ptLine.fragments.length === 0 && extras.strut
      ? [{ itemIndex: 0, text: '', gapBefore: 0, gapItemIndex: -1, occupiedWidth: 0 }]
      : ptLine.fragments;
    for (const frag of fragments) {
      const item = items[frag.itemIndex];
      if (!item) continue;
      const spansBefore = spans.length;

      const metrics = fontMetricsFn(item);
      // baselineOffset: superscript → negative (glyph moves up).
      // ascent must increase (glyph above baseline), descent must decrease (less overhang below).
      // subscript → positive (glyph moves down).
      // ascent must decrease, descent must increase.
      const effectiveAscent = metrics.ascent - (item.metadata.baselineOffset || 0);
      const effectiveDescent = metrics.descent + (item.metadata.baselineOffset || 0);

      maxAscent = Math.max(maxAscent, effectiveAscent);
      maxDescent = Math.max(maxDescent, effectiveDescent);
      inlineBoxes.push({
        ascent: metrics.ascent,
        descent: metrics.descent,
        fontSize: item.metadata.effectiveFontSize,
        shift: item.metadata.baselineOffset || 0,
        atomic: !!item.metadata.inlineWidget,
      });

      if (item.metadata.effectiveFontSize >= maxFontSizeSeen) {
        maxFontSizeSeen = item.metadata.effectiveFontSize;
        dominantTypoAscFrac = metrics.typoAscFrac;
        dominantWinAscFrac = metrics.winAscFrac;
        dominantUseTypoMetrics = metrics.useTypoMetrics;
      }

      // pretext: gapBefore — inter-word space BEFORE the word
      // occupiedWidth = gapBefore + textWidth
      // Split into two Span: space + word
      const gapWidth = frag.gapBefore || 0;
      const textWidth = frag.occupiedWidth;

      const baseFontMetrics = {
        ascent: metrics.ascent,
        descent: metrics.descent,
        fontSize: item.metadata.effectiveFontSize,
        baselineOffset: item.metadata.baselineOffset || undefined,
      };

      if (gapWidth > 0) {
        // The collapsed space before this fragment belongs to the run that holds
        // it in source — this one, the previous one, or a lone separator run
        // (the " " between `</b>` and `<del>`) — and carries that run's paint
        // (background / underline / colour), as a browser attributes it.
        // pretext names that run (`gapItemIndex`), and measured the space in its font.
        const gapIndex = frag.gapItemIndex >= 0 && items[frag.gapItemIndex] ? frag.gapItemIndex : frag.itemIndex;
        const gapItem = items[gapIndex];
        spans.push({
          x: 0,
          width: gapWidth,
          text: ' ',
          itemIndex: gapIndex,
          pIdx: 0,
          tag,
          fontMetrics: baseFontMetrics,
          style: gapItem.metadata.style,
          inlineWidget: gapItem.metadata.inlineWidget,
          type: 'space',
        });
      }

      // Split leading/trailing spaces from frag.text into separate space spans
      // This is needed for SVG rendering to avoid xml:space="preserve" dependency.
      // An inline box is a box to pretext, with no text: it stands for U+FFFC,
      // as the run does in the source text.
      const text = item.metadata.inlineWidget ? '\uFFFC' : frag.text;
      const leadingMatch = text.match(/^(\s+)/);

      let remainingText = text;
      let leadingSpaceChars = 0;
      let trailingSpaceChars = 0;

      if (leadingMatch) {
        leadingSpaceChars = leadingMatch[1].length;
        remainingText = remainingText.slice(leadingSpaceChars);
      }
      if (remainingText.length > 0) {
        const trailMatch = remainingText.match(/(\s+)$/);
        if (trailMatch) {
          trailingSpaceChars = trailMatch[1].length;
          remainingText = remainingText.slice(0, -trailingSpaceChars);
        }
      }

      // Split the pretext fragment into leading-space / trimmed-text /
      // trailing-space pieces and give each a width.
      //  - one piece of text → use pretext's authoritative width for the whole
      //    fragment (a piece of only spaces is measured: in pre-wrap pretext
      //    leaves the spaces that hang at the line end out of its width)
      //  - several  → measure each piece directly. Line breaking and positioning
      //    now read the same fontkit tables, so the pieces sum back to the
      //    fragment width; the old proportional `correctToSumInvariant` fix-up
      //    (a leftover from the canvas-vs-fontkit split) is gone.
      const fragments: string[] = [];
      if (leadingSpaceChars > 0) fragments.push(text.slice(0, leadingSpaceChars));
      if (remainingText.length > 0) fragments.push(remainingText);
      if (trailingSpaceChars > 0) fragments.push(text.slice(leadingSpaceChars + remainingText.length));

      const { fontFamily, fontWeight, fontStyle } = item.metadata.style;
      const fsWeight = String(fontWeight || 400);
      const fsStyle = fontStyle || 'normal';

      // measureText knows no letter-spacing; pretext adds it after every
      // character, so a measured piece gets it back the same way
      const tracking = item.metadata.style.letterSpacing ?? 0;
      const resolvedWidths: number[] = fragments.length === 1 && remainingText.length > 0
        ? [textWidth]
        : fragments.map((t) => measureText(t, baseFontMetrics.fontSize, fontFamily, fsWeight, fsStyle) + tracking * [...t].length);
      let resolvedIdx = 0;
      const leadingWidth = leadingSpaceChars > 0 ? resolvedWidths[resolvedIdx++] : 0;
      const trimmedWidth = remainingText.length > 0 ? resolvedWidths[resolvedIdx++] : 0;
      const trailingWidthVal = trailingSpaceChars > 0 ? resolvedWidths[resolvedIdx++] : 0;

      // Leading space span
      if (leadingSpaceChars > 0) {
        const leadingText = text.slice(0, leadingSpaceChars);
        spans.push({
          x: 0,
          width: leadingWidth,
          text: leadingText,
          itemIndex: frag.itemIndex,
          pIdx: 0,
          tag,
          fontMetrics: baseFontMetrics,
          style: item.metadata.style,
          inlineWidget: item.metadata.inlineWidget,
          type: 'space',
        });
      }

      // Text span (trimmed)
      if (remainingText.length > 0) {
        const actualTextWidth = trimmedWidth;
        spans.push({
          x: 0,
          width: actualTextWidth,
          text: remainingText,
          itemIndex: frag.itemIndex,
          pIdx: 0,
          tag,
          fontMetrics: baseFontMetrics,
          style: item.metadata.style,
          inlineWidget: item.metadata.inlineWidget,
          type: 'text',
        });
      }

      // Trailing space span
      if (trailingSpaceChars > 0) {
        const trailingStart = leadingSpaceChars + remainingText.length;
        const trailingText = text.slice(trailingStart, trailingStart + trailingSpaceChars);
        spans.push({
          x: 0,
          width: trailingWidthVal,
          text: trailingText,
          itemIndex: frag.itemIndex,
          pIdx: 0,
          tag,
          fontMetrics: baseFontMetrics,
          style: item.metadata.style,
          inlineWidget: item.metadata.inlineWidget,
          type: 'space',
        });
      }

      // strut: a zero-width empty span carries the run's style and metrics
      if (text.length === 0 && spans.length === spansBefore) {
        spans.push({
          x: 0,
          width: 0,
          text: '',
          itemIndex: frag.itemIndex,
          pIdx: 0,
          tag,
          fontMetrics: baseFontMetrics,
          style: item.metadata.style,
          type: 'text',
        });
      }
      for (let k = spansBefore; k < spans.length; k++) metricsOf.set(spans[k], metrics);
    }

    // ── Inline-box width correction ─────────────────────────
    // When a span has an inlineWidget, override its width
    // to match the widget width (the \uFFFC advance is not included).
    for (const s of spans) {
      if (s.inlineWidget) {
        s.width = s.inlineWidget.width;
      }
    }

    // ── Prepare marker data (only on first line) ──────────────────
    // For 'inside': marker is inserted into the span flow before X positioning.
    // For 'outside': marker is added after X positioning with a custom x in the bullet zone.
    let outsideMarkerSpan: Span | null = null;

    if (isListItem && isFirstLine && !extras.noMarker) {
      const firstRun = items[0];
      const markerAscent = markerFontSize * 0.8; // approximate ascent for marker
      const markerDescent = markerFontSize * 0.2;

      maxAscent = Math.max(maxAscent, markerAscent);
      maxDescent = Math.max(maxDescent, markerDescent);
      inlineBoxes.push({ ascent: markerAscent, descent: markerDescent, fontSize: markerFontSize, shift: 0 });

      // Create a style object for the marker span
      const markerStyle = {
        ...(firstRun?.metadata.style ?? {
          fontFamily: 'Arial',
          fontSize: markerFontSize,
          fontWeight: 400,
          fontStyle: 'normal' as const,
          color: '#000000',
          type: 'text' as const,
          text: markerText,
        }),
        fontSize: markerFontSize,
        fontFamily: markerFontFamily,
        text: markerText,
        // PowerPoint draws no underline / strike through a bullet
        ...(mode === 'office' ? { underline: false, strikethrough: false } : {}),
      };

      const markerSpanBase: Span = {
        x: 0,
        width: markerWidth,
        text: markerText,
        itemIndex: 0,
        pIdx: 0,
        tag,
        fontMetrics: {
          ascent: markerAscent,
          descent: markerDescent,
          fontSize: markerFontSize,
        },
        style: markerStyle,
        type: 'marker',
      };

      // For 'inside': marker is part of text flow — insert at beginning of spans
      // For 'outside': store for later (after X positioning)
      if (listStyle!.position === 'inside') {
        spans.unshift(markerSpanBase);
        // Add a small gap after the marker (0.5em)
        const gapWidth = markerFontSize * 0.5;
        spans.splice(1, 0, {
          x: 0,
          width: gapWidth,
          text: ' ',
          itemIndex: 0,
          pIdx: 0,
          tag,
          fontMetrics: {
            ascent: 0,
            descent: 0,
            fontSize: markerFontSize,
          },
          style: markerStyle,
          type: 'space',
        });
      } else {
        // 'outside' (default): marker sits in the bullet zone, left of text
        outsideMarkerSpan = markerSpanBase;
      }
    }

    // ── Mark trailing whitespace spans ───────────────────
    // CSS Text §4.1.3: end-of-line spaces have zero measure for line-advance calculations.
    // Parley: LineItemData.has_trailing_whitespace → trailing whitespace is excluded from advance.
    //
    // Find the last space(s) at the end of the line and mark them trailing.
    let trailingStartIndex = spans.length;
    for (let i = spans.length - 1; i >= 0; i--) {
      if (spans[i].type === 'space') {
        trailingStartIndex = i;
      } else {
        break;
      }
    }

    const trailingWidth = spans
      .slice(trailingStartIndex)
      .reduce((sum, f) => sum + f.width, 0);

    // browser: where spaces collapse (normal / nowrap / pre-line), CSS removes
    // them at the line end altogether — nothing is painted there, no background
    // or underline (a `<mark>` ending in a soft wrap stops at its last glyph).
    // office: PowerPoint draws no underline under the spaces a line ends with,
    // whatever the white-space (scripts/office-metrics/TEXT-FEATURES-RESULTS.md §5).
    const ws = style.whiteSpace ?? 'normal';
    const collapsible = mode === 'office' || ws === 'normal' || ws === 'nowrap' || ws === 'pre-line';
    for (let i = trailingStartIndex; i < spans.length; i++) {
      spans[i].trailing = true;
      if (collapsible) spans[i].collapsed = true;
    }

    // ── Compute effective line width (excluding trailing whitespace) ─
    // Use sum of actual span widths instead of ptLine.width, because
    // ptLine.width may not include gapBefore spaces that were split into
    // separate Span (e.g. "AA" + " A" → [AA][ ][A]).
    const totalSpanWidth = spans.reduce((sum, f) => sum + f.width, 0);
    const effectiveLineWidth = totalSpanWidth - trailingWidth;

    // ── X positioning ───────────────────────────────
    const indent = isFirstLine
      ? effectiveLeftIndent + (style.indent || 0) + firstLineMarkerOverflow
      : effectiveLeftIndent;
    const rightIndent = style.rightIndent || 0;
    const availableWidth = maxWidth - indent - rightIndent;

    // maxWidth is Infinity for an auto-width frame (no explicit width, e.g.
    // TableLayoutEngine measuring a cell's natural size with wrap:false).
    // "center"/"right" within an unbounded box is undefined — without this
    // guard, slack became Infinity and every downstream x/width computation
    // corrupted to NaN. Falling back to 0 slack (→ left/start alignment)
    // matches CSS shrink-to-fit: an auto-sized box has no extra room to
    // center or push right into in the first place.
    const slack = Number.isFinite(availableWidth) ? Math.max(0, availableWidth - effectiveLineWidth) : 0;

    let xOffset = indent;

    if (style.alignment === 'center') {
      xOffset = indent + slack / 2;
    } else if (style.alignment === 'right') {
      xOffset = indent + slack;
    } else if (style.alignment === 'justify') {
      // Justify: distribute slack evenly among whitespace spans
      // (excluding trailing whitespace).
      //
      // CSS Text Module Level 3 §4.1.3: trailing spaces do not participate in justify.
      // CSS text-align-last: last line is not justify, but start-align.
      // OOXML (ISO 29500): last line of paragraph is not stretched.
      // Parley alignment.rs: excludes last line (line.break_reason == None/Explicit)
      //   and lines with num_spaces == 0.
      //
      // Determine if this is the last line in the paragraph. A piece of a
      // paragraph that ends in `\n` justifies its last line in office
      // (PowerPoint stretches a line ending in <a:br/>), never in browser.
      const isLastLine = lineIdx === pretextLines.length - 1 && !extras.justifyLastLine;

      if (!isLastLine && slack > 0) {
        // Every space of the line takes an equal share — including spaces
        // inside a run, which pretext hands over inside one text fragment.
        spans = splitSpacesForJustify(spans, measureText, metricsOf);
        // Count only "stretchable" spaces: type === 'space' and !trailing,
        // one share per space character.
        const stretchableSpaces = spans.filter(
          (f) => f.type === 'space' && !f.trailing,
        );
        const shares = stretchableSpaces.reduce((n, f) => n + f.text.length, 0);
        if (shares > 0) {
          const extraPerSpace = slack / shares;
          for (const sf of stretchableSpaces) {
            sf.width += extraPerSpace * sf.text.length;
          }
        }
      }

      // If this is the last line or no spaces — fallback to start-align
      // (LTR → left, RTL → right — always left for now, Bidi in Phase 2)
      xOffset = indent;
    }

    // Assign X positions
    let runX = xOffset;
    for (const frag of spans) {
      frag.x = Math.round(runX * 100) / 100;
      runX += frag.width;
    }

    // ── Outside marker: place in the bullet zone (left of text) ──
    // browser: right-aligned within the bullet zone so multi-digit numbers
    // ("9." vs "10.") share the same right edge (CSS list-style-position:
    // outside — the marker is outside the principal box).
    // office: left-aligned at the start of the zone (`marL + indent`), the text
    // after it (PowerPoint, measured — TEXT-FEATURES-RESULTS.md §2).
    if (outsideMarkerSpan) {
      if (mode === 'office') {
        outsideMarkerSpan.x = round2(xOffset - bulletZoneIndent - firstLineMarkerOverflow);
      } else {
        // Right edge of the bullet zone = xOffset (start of text)
        // Marker right-aligned: x = xOffset - markerWidth - small gap
        const gap = outsideMarkerSpan.fontMetrics.fontSize * 0.25; // 0.25em gap
        outsideMarkerSpan.x = Math.round((xOffset - outsideMarkerSpan.width - gap) * 100) / 100;
      }
      // Prepend so it appears first in the spans array
      spans.unshift(outsideMarkerSpan);
    }

    // Line box must cover ALL spans, including outside markers that sit
    // left of the principal text box. Otherwise contentWidth / computeBBox
    // miss the marker and content sizing clips it.
    let lineX = xOffset;
    let lineWidth = runX - xOffset;
    if (spans.length > 0) {
      // running min/max — avoids two `spans.map` allocations plus a spread that
      // blows the call stack on pathologically long lines.
      let minSpanX = Infinity;
      let maxSpanRight = -Infinity;
      for (let k = 0; k < spans.length; k++) {
        const sx = spans[k].x;
        if (sx < minSpanX) minSpanX = sx;
        const sr = sx + spans[k].width;
        if (sr > maxSpanRight) maxSpanRight = sr;
      }
      lineX = minSpanX;
      lineWidth = maxSpanRight - minSpanX;
    }
    // contentWidth is the absolute right edge of content (not just line.width).
    // When line.x > 0 (outside marker, indent, center/right), consumers that
    // size the canvas as contentWidth with viewBox origin 0 need this value.
    //
    // Derived from the same 2dp-rounded values the emitted Line carries, so
    // that contentWidth === max(line.x + line.width) exactly. Summing the raw
    // floats here instead left contentWidth a few thousandths off the line box
    // it is supposed to bound.
    contentWidth = Math.max(contentWidth, round2(lineX) + round2(lineWidth));



    // ── Y positioning ───────────────────────────────
    // Line height algorithm depends on mode:
    //
    // 'browser' (CSS inline formatting, Chrome-exact): every run and marker is
    //   an inline box with its own `fontSize × lineHeight` and half-leading;
    //   the line box bounds them all — see `browserLineBox`.
    //
    // 'office' (MS Office / DrawingML):
    //   line box = OFFICE_LINE_BOX_RATIO (1.20, font-independent) × the line's
    //   max run size × style.lineHeight (`<a:lnSpc><a:spcPct>`). PowerPoint SVG
    //   exports match this pitch exactly for Roboto at spcPct 1.0 / 1.5 / 2.0
    //   (see office-cases/MIGRATION.md). Baseline sits at OFFICE_BASELINE_RATIO
    //   (0.75) × lineBox from the box top, every line including the first —
    //   *except* at spcPct = 100% (style.lineHeight === 1), where PowerPoint
    //   puts it at the dominant run's own `winAscFrac` =
    //   winAscent / (winAscent + winDescent): the font's win box scaled to the
    //   1.2 × size line box. Measured on Arial, Roboto, Times New Roman,
    //   Georgia, Verdana, Courier New and Tahoma, 12–144 pt: every PDF
    //   baseline (whole slide points) lies within its rounding of this ratio,
    //   and the SVG export of Roboto 18 pt agrees (scripts/office-metrics/
    //   TEXT-FEATURES-RESULTS.md). The older `(typoAscFrac + winAscFrac) / 2`
    //   (RESULTS.md "font-grid" corpus) sat 1.7–3.6 pt too high at 144 pt;
    //   Courier New, whose win ratio is below its typo ratio, rules out any
    //   blend with the typo ratio. Fonts with OS/2 `fsSelection.useTypoMetrics`
    //   set (only Unifont so far) fall back to the flat constant — one data
    //   point isn't enough to derive their own rule. spcPct ≠ 100% keeps flat
    //   0.75 (PowerPoint's SVG export matches it within 0.1 pt at 150 / 200%).
    // office: the marker does not size the line (a 150 % bullet leaves the
    // line box at 1.2 × the text — PowerPoint, measured).
    const maxFontSize = spans.reduce((max, f) => (mode === 'office' && f.type === 'marker' ? max : Math.max(max, f.fontMetrics.fontSize)), 0);

    let lineBoxHeight: number;
    let baseline: number;

    if (mode === 'office') {
      let baselineRatio = OFFICE_BASELINE_RATIO;
      if (style.lineHeight === 1 && dominantUseTypoMetrics !== true) {
        const t = dominantTypoAscFrac;
        const w = dominantWinAscFrac;
        if (w != null && w > 0 && w < 1) {
          baselineRatio = w;
        } else if (t != null && t > 0 && t < 1) {
          baselineRatio = t; // OS/2 present but winAscent/winDescent missing
        }
      }
      lineBoxHeight = OFFICE_LINE_BOX_RATIO * maxFontSize * style.lineHeight;
      baseline = lineBoxHeight * baselineRatio;
    } else {
      // Browser: CSS inline formatting (see browserLineBox).
      ({ height: lineBoxHeight, baseline } = browserLineBox(inlineBoxes, style.lineHeight));
    }

    const startIdx = charIndex;

    // Count characters in line (for INDEX_CONSIST)
    let lineCharCount = 0;
    for (const frag of spans) {
      // Marker spans don't count toward the paragraph's character index
      if (frag.type !== 'marker') {
        lineCharCount += frag.text.length;
      }
    }
    const endIdx = startIdx + lineCharCount;
    charIndex = endIdx;

    // ── Mark break type on the last span ─────────────
    // 'soft' — line wrap due to width constraint
    // 'hard' — explicit break (\n)
    // 'none'/undefined — not a line end (no break)
    if (spans.length > 0) {
      const lastSpan = spans[spans.length - 1];
      const lastSpanItem = items[lastSpan.itemIndex];
      // If last character is \n, it's a hard break
      if (lastSpanItem && lastSpan.text.endsWith('\n')) {
        lastSpan.breakType = 'hard';
      } else if (lineIdx < pretextLines.length - 1) {
        lastSpan.breakType = 'soft';
      }
    }

    lines.push({
      x: round2(lineX),
      y: round2(currentY),
      width: round2(lineWidth),
      // browser: a LayoutUnit multiple (1/64) — exact in a double, and the frame
      // re-accumulates `y` from it, so 2 dp rounding would drift ~0.005px/line.
      height: mode === 'browser' ? lineBoxHeight : Math.round(lineBoxHeight * 100) / 100,
      baseline: Math.round(baseline * 100) / 100,
      ascent: Math.round(maxAscent * 100) / 100,
      descent: Math.round(maxDescent * 100) / 100,
      startIndex: startIdx,
      endIndex: endIdx,
      alignment: style.alignment,
      ...(mode === 'office' && hasDecoration(spans) ? { decorations: officeDecorations(spans, metricsOf, baseline) } : {}),
      spans,
    });


    currentY += lineBoxHeight;
    isFirstLine = false;
  }

  // Add spaceAfter to last line height
  // (return as is — ParagraphLayoutEngine will add spaceAfter to total height)

  return { lines, contentWidth };
}