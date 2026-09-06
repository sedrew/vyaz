/**
 * TextFrameLayoutEngine.ts — Layout a full TextFrame (multi-paragraph).
 *
 * Pipeline:
 *   TextFrame → Paragraph[] → paragraphLayoutEngine.layout() each → merge Line[]
 *
 * Handles:
 * - Paragraph stacking with Y offset accumulation
 * - Multi-column layout (CSS multi-column model)
 * - Padding (left reduces available width, left shifts X)
 * - frame.width/height optional → fitHorizontal/fitVertical flags
 * - List grouping: consecutive paragraphs with listStyle form a list group.
 *   Numbered list indices are auto-incremented within each group.
 *   `listRestart: true` breaks a group and restarts numbering.
 *
 * Multi-column algorithm:
 *   1. Calculate colWidth = (frameWidth - (count-1)*gap - padding) / count
 *   2. Layout each paragraph with maxWidth = colWidth (NOT frame.width)
 *   3. Distribute lines column-by-column (column-fill: auto)
 *   4. If frame.height is set, lines overflow to next column when colHeight exceeded
 *   5. If no frame.height, columns are infinite (all lines stay in column 0)
 */
import type { TextFrame, ListStyle, VerticalAlignment, Paragraph, WritingMode } from '../types/Document.js';
import type { Line, LayoutWarning } from '../types/LayoutTypes.js';
import { paragraphLayoutEngine, ParagraphLayoutEngine } from './ParagraphLayoutEngine.js';
import { splitParagraphByHardBreaks } from '../compile/ParagraphCompiler.js';
import { applyScale } from './AutoFitEngine.js';
import { formatListNumber, defaultBulletChar } from '../utils/list.js';
import { getMeasureProfile, setMeasureProfile } from '../measure/FontkitMeasureContext.js';

/**
 * Result of laying out a full TextFrame.
 *
 * `fitHorizontal` / `fitVertical` tell the renderer which dimension to use:
 * - `'frame'`   → use `frameWidth` / `frameHeight`
 * - `'content'` → use `contentWidth` / `contentHeight`
 */
export interface TextFrameLayoutResult {
  lines: Line[];
  /** Intrinsic content box — the text bounding box. */
  content: { width: number; height: number };
  /** Frame box as given on the input; an axis is omitted when its size was not set. */
  frame: { width?: number; height?: number };
  /**
   * Whether content spills past the frame on each axis. `false` for an axis
   * with no frame size. Use it to decide auto-grow vs clip vs autofit.
   */
  overflow: { horizontal: boolean; vertical: boolean };
  /**
   * Which size a renderer should use per axis: `'frame'` when a frame size was
   * provided, otherwise `'content'`.
   */
  fit: { horizontal: 'frame' | 'content'; vertical: 'frame' | 'content' };
  /** Present when autofit ran — the scale applied and whether it bottomed out. */
  autofit?: AutofitOutcome;
  /**
   * Block flow direction this layout was produced for — echoes
   * `TextFrame.writingMode`, defaulting to `'horizontal-tb'`.
   */
  writingMode: WritingMode;
  /**
   * Post-layout rigid transform to realise `writingMode: 'sideways-*'` and/or
   * `TextFrame.rotation`. Omitted when the net rotation is a multiple of 360°
   * (nothing to apply). `lines`, `content` bbox aside, live in pre-rotation
   * layout space; `content` / `overflow` are reported in **visual** space.
   */
  transform?: FrameTransform;
  /** Non-fatal issues (font fallback / substitution). Omitted when empty. */
  warnings?: LayoutWarning[];
}

/**
 * Rigid transform a renderer applies to {@link TextFrameLayoutResult.lines} so a
 * `sideways-*` writing mode or an explicit `rotation` takes visual effect. The
 * layout math itself (line breaking, measuring, positioning) is unchanged.
 */
export interface FrameTransform {
  /** Net clockwise rotation in degrees, normalised to `[0, 360)`. */
  rotate: number;
  /**
   * The box `lines` occupy in their own pre-rotation coordinate space. The
   * renderer rotates this box about its centre; for `rotate` of 90 / 270 the
   * visible canvas is this box with width and height swapped.
   */
  layoutBox: { width: number; height: number };
}

/** Normalise a degree value into `[0, 360)`. */
function normalizeDeg(d: number): number {
  const r = d % 360;
  return r < 0 ? r + 360 : r;
}

/**
 * Resolve the marker text for a list item (needed for width measurement).
 */
function getMarkerTextHelper(listStyle: ListStyle, listIndex: number): string {
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
 * Compute the widest marker across a list group, used to expand bulletIndent
 * when numbered markers have varying widths (e.g. "9." vs "10.").
 */
function computeMaxMarkerWidth(
  listStyle: ListStyle,
  startIndex: number,
  count: number,
  measureText: (text: string, fontSize: number) => number,
): number {
  if (listStyle.type !== 'number') return 0;
  let maxWidth = 0;
  for (let i = 0; i < count; i++) {
    const markerText = getMarkerTextHelper(listStyle, startIndex + i);
    const width = measureText(markerText, 12); // approximate, will be refined by positionLines
    maxWidth = Math.max(maxWidth, width);
  }
  return maxWidth;
}

/**
 * Apply vertical alignment to lines within a column.
 *
 * @param lines — lines belonging to this column (already has correct x/y)
 * @param colHeight — total column height (frame.height or content height)
 */
function applyVerticalAlignment(
  lines: Line[],
  colHeight: number,
  alignment: VerticalAlignment,
): void {
  if (alignment === 'top' || lines.length === 0) return;

  const firstLineY = lines[0].y;
  const lastLineEnd = lines[lines.length - 1].y + lines[lines.length - 1].height;
  const contentHeight = lastLineEnd - firstLineY;
  const extraSpace = colHeight - contentHeight;
  if (extraSpace <= 0) return;

  let offset = 0;
  if (alignment === 'middle') {
    offset = extraSpace / 2;
  } else if (alignment === 'bottom') {
    offset = extraSpace;
  }

  for (const line of lines) {
    line.y += offset;
  }
}

/** Options for {@link layoutTextFrame}. */
export interface LayoutOptions {
  /**
   * Fill `Span.glyphAdvances` on every text span. Needed only by the SVG
   * `glyph` preset and by caret hit-testing; off by default because it costs
   * O(chars) font lookups + allocation on every layout.
   */
  glyphAdvances?: boolean;
  /**
   * Metric mode for this layout, overriding the provider's global mode:
   *   - `'browser'` (default) — CSS/Chrome line-box, hhea ascent/descent
   *   - `'office'` — PowerPoint/DrawingML line-box, OS/2 winAscent/winDescent
   */
  mode?: 'browser' | 'office';
  /**
   * Shrink every run's `fontSize` proportionally until the content fits the
   * frame box. `true` uses defaults; an object bounds the minimum size.
   * The chosen scale is reported on `result.autofit`.
   */
  autofit?: boolean | { minFontSize?: number };
  /**
   * What to do when none of a run's `fontFamily` entries are registered:
   *   - `'throw'` (default) — raise `FontNotFoundError`
   *   - `'substitute'` — use any registered family and add a `result.warnings`
   *     entry instead of failing
   */
  onMissingFont?: 'throw' | 'substitute';
  /**
   * Measure widths through fontkit's `layout()` — GPOS kerning + GSUB ligatures,
   * i.e. what a browser paints — instead of the default per-code-point advance
   * sum. Applies to line breaking and positioning for this call only. Leave off
   * unless the output is consumed by a browser (SVG `browser` preset).
   */
  shaping?: boolean;
  /**
   * Fill `Span.notdefRanges` on every text span — the character ranges no
   * registered font covers. The SVG `glyph` preset always does this (it
   * resolves the same font anyway); set this to get it for the flat / browser
   * / preserve presets, which `renderToSVG({ missingGlyph: 'box' })` reads to
   * draw an explicit placeholder instead of passing the raw code point to the
   * viewer's fallback. Cheap: a cmap lookup per character, no glyph objects.
   */
  markMissingGlyphs?: boolean;
}

/** Autofit outcome, present on the result when {@link LayoutOptions.autofit} was set. */
export interface AutofitOutcome {
  /** Proportional font-size scale applied (1 = no shrink). */
  scale: number;
  /** True when the min-size floor was hit and content still overflows. */
  clampedToMin: boolean;
}

/**
 * Layout a full TextFrame (paragraphs stacked with Y-offset accumulation).
 *
 * Uses a shared default engine with its own bounded prepared-line cache. For
 * isolation, an explicit cache bound, or `clearCache()`, make your own via
 * {@link createLayoutEngine}.
 */
export function layoutTextFrame(frame: TextFrame, options: LayoutOptions = {}): TextFrameLayoutResult {
  return runFlow(frame, options, paragraphLayoutEngine);
}

/** @internal Shared implementation, parameterised by the engine instance. */
export function runFlow(
  frame: TextFrame,
  options: LayoutOptions,
  engine: ParagraphLayoutEngine,
): TextFrameLayoutResult {
  if (options.autofit || frame.autofit?.enabled) {
    return runAutofit(frame, options, engine);
  }
  if (options.shaping) {
    const saved = getMeasureProfile();
    setMeasureProfile({ engine: 'shape' });
    try {
      return runFlow(frame, { ...options, shaping: false }, engine);
    } finally {
      setMeasureProfile(saved);
    }
  }
  const wantGlyphAdvances = options.glyphAdvances === true;
  const markMissingGlyphs = options.markMissingGlyphs === true;
  const mode = options.mode;
  const onMissingFont = options.onMissingFont ?? 'throw';
  const warnings: LayoutWarning[] = [];

  // ── Writing mode ─────────────────────────────────────────────────
  // `sideways-*` lays the block out horizontally, then a rigid ±90° turn is
  // reported on the result for the renderer to apply. The only layout-time
  // effect: the inline (wrap) axis runs along the frame's *height*.
  const writingMode: WritingMode = frame.writingMode ?? 'horizontal-tb';
  const sideways = writingMode === 'sideways-rl' || writingMode === 'sideways-lr';

  // ── Multi-column setup ────────────────────────────────────────────
  const leftPad = frame.padding?.left ?? 0;
  const rightPad = frame.padding?.right ?? 0;
  const topPad = frame.padding?.top ?? 0;
  const bottomPad = frame.padding?.bottom ?? 0;

  // Multi-column + sideways is out of scope — the column model is width-based.
  const hasColumns = !sideways && frame.columns != null && frame.columns.count > 1 && frame.width != null;
  let colWidth: number | undefined;
  let colCount = 1;
  let colGap = 0;

  if (hasColumns) {
    colCount = frame.columns!.count;
    colGap = frame.columns!.gap;
    const totalPad = leftPad + rightPad + (colCount - 1) * colGap;
    colWidth = (frame.width! - totalPad) / colCount;
  }

  const colHeight = frame.height != null
    ? frame.height - topPad - bottomPad
    : Infinity;

  const verticalAlign: VerticalAlignment = frame.verticalAlignment ?? 'top';

  // ── List grouping pass ──────────────────────────────────────────
  // (identical to before, but uses colWidth for maxWidth later)
  const listIndices: (number | undefined)[] = new Array(frame.paragraphs.length).fill(undefined);
  const listMarkerWidths: (number | undefined)[] = new Array(frame.paragraphs.length).fill(undefined);

  let i = 0;
  while (i < frame.paragraphs.length) {
    const p = frame.paragraphs[i];
    const ls = p.style.listStyle;

    if (!ls || ls.type === 'none') {
      i++;
      continue;
    }

    // Find end of this list group
    let groupStart = i;
    let groupEnd = i + 1;
    while (groupEnd < frame.paragraphs.length) {
      const nextP = frame.paragraphs[groupEnd];
      const nextLs = nextP.style.listStyle;
      if (!nextLs || nextLs.type !== ls.type || nextP.style.listRestart) {
        break;
      }
      // Same nesting level only
      if ((nextLs.level ?? 0) !== (ls.level ?? 0)) {
        break;
      }
      groupEnd++;
    }

    const groupSize = groupEnd - groupStart;
    const startNumber = ls.startNumber ?? 1;

    // Assign indices
    for (let j = 0; j < groupSize; j++) {
      listIndices[groupStart + j] = startNumber + j;
    }

    // Compute max marker width for numbered lists in this group
    const paraFontSize = p.children[0]?.fontSize ?? 12;
    const measureMarkerWidth = (text: string, fontSize: number): number => {
      return text.length * fontSize * 0.6;
    };
    const maxMW = computeMaxMarkerWidth(ls, startNumber, groupSize, measureMarkerWidth);
    for (let j = 0; j < groupSize; j++) {
      listMarkerWidths[groupStart + j] = maxMW;
    }

    i = groupEnd;
  }

  // ── Layout pass ─────────────────────────────────────────────────
  const allLines: Line[] = [];
  let contentWidth = 0;

  const currentColY: number[] = new Array(colCount).fill(topPad);
  // Multi-column lines are collected here first (with the extra space that
  // precedes each), then distributed across columns after every paragraph is
  // laid out — so `balance` knows the total height.
  const colLines: Line[] = [];
  const colGaps: number[] = [];
  let pendingColGap = 0;

  /**
   * Layout a single paragraph (may be virtual from splitParagraphByHardBreaks).
   * Returns { lines, contentWidth, height }.
   */
  function layoutSingleParagraph(
    p: Paragraph,
    maxWidth: number,
    pIdx: number,
    listIndex?: number,
    listMarkerWidth?: number,
  ): { lines: Line[]; height: number; contentWidth: number; warnings?: LayoutWarning[] } {
    const listStyle = p.style.listStyle;

    // Fast path: empty paragraph → hard-break line (from \n separator)
    if (p.children.length === 0) {
      // Use the paragraph's own style or fallback to default font metrics
      const fontSize = 12;
      const lineHeight = p.style.lineHeight;
      const lineHeightPx = Math.round(fontSize * lineHeight);
      return {
        lines: [{
          x: 0, y: 0, width: 0, height: lineHeightPx,
          baseline: Math.round(fontSize * 0.8),
          ascent: Math.round(fontSize * 0.8),
          descent: Math.round(fontSize * 0.2),
          startIndex: 0, endIndex: 0,
          isHardBreak: true,
          spans: [],
        }],
        height: lineHeightPx,
        contentWidth: 0,
      };
    }

    const result = engine.layout(
      p,
      maxWidth,
      0, // relative yOffset — we position lines in the caller
      undefined,
      listStyle,
      listIndex,
      listMarkerWidth,
      wantGlyphAdvances,
      mode,
      onMissingFont,
      markMissingGlyphs,
    );

    return {
      lines: result.lines,
      height: result.contentHeight,
      contentWidth: result.contentWidth,
      warnings: result.warnings,
    };
  }

  // For non-column layout, we use a single "virtual column" approach
  for (let i = 0; i < frame.paragraphs.length; i++) {
    const p = frame.paragraphs[i];

    // Zero phase: split `pre`/`pre-line`/`pre-wrap` paragraphs on \n
    const subParagraphs = splitParagraphByHardBreaks(p);

    // Available inline size: colWidth if columns; otherwise the frame's inline
    // axis minus its padding. Under `sideways-*` the inline axis is the frame
    // *height* (wrap clips by height), so read that instead of the width.
    const inlineFrameSize = sideways ? frame.height : frame.width;
    const inlinePadStart = sideways ? topPad : leftPad;
    const inlinePadEnd = sideways ? bottomPad : rightPad;
    const maxWidth = hasColumns
      ? colWidth!
      : inlineFrameSize !== undefined
        ? inlineFrameSize - inlinePadStart - inlinePadEnd
        : Infinity;

    const listIndex = listIndices[i];
    const listMarkerWidth = listMarkerWidths[i];

    // Layout each sub-paragraph
    for (let subIdx = 0; subIdx < subParagraphs.length; subIdx++) {
      // If wrap is disabled, force no-wrap for this call only — clone rather
      // than mutate `subParagraphs[subIdx]`, which for a paragraph with no hard
      // breaks is the *same object* as the caller's `frame.paragraphs[i]`
      // (splitParagraphByHardBreaks returns it unchanged). Mutating `.style`
      // in place used to leak into that shared object, corrupting any other
      // layoutTextFrame() call still holding a reference to it (e.g. measuring
      // the same TextFrame twice, once unconstrained then once wrapped).
      const subPara = frame.wrap === false && subParagraphs[subIdx].style.whiteSpace !== 'nowrap'
        ? { ...subParagraphs[subIdx], style: { ...subParagraphs[subIdx].style, whiteSpace: 'nowrap' as const } }
        : subParagraphs[subIdx];

      // Add spaceBefore only for the first sub-paragraph of each original paragraph
      if (subIdx === 0) {
        if (hasColumns) pendingColGap += p.style.spaceBefore;
        else currentColY[0] += p.style.spaceBefore;
      }
      const subResult = layoutSingleParagraph(
        subPara,
        maxWidth,
        i,
        listIndex,
        listMarkerWidth,
      );
      if (subResult.warnings) warnings.push(...subResult.warnings);

      for (const line of subResult.lines) {
        if (!hasColumns) {
          // Non-column: simple accumulation
          line.x += leftPad;
          for (const span of line.spans) {
            span.pIdx = i;
          }
          allLines.push(line);
          contentWidth = Math.max(contentWidth, subResult.contentWidth);
          line.y = currentColY[0];
          currentColY[0] += line.height;
          continue;
        }

        // Multi-column: defer placement — collect the line and the space that
        // precedes it. Distribution happens after all paragraphs are laid out.
        for (const span of line.spans) span.pIdx = i;
        colLines.push(line);
        colGaps.push(pendingColGap);
        pendingColGap = 0;
      }

      // spaceAfter after the LAST sub-paragraph of the original paragraph
      if (subPara === subParagraphs[subParagraphs.length - 1]) {
        if (hasColumns) pendingColGap += p.style.spaceAfter;
        else currentColY[0] += p.style.spaceAfter;
      }
    } // end for each paragraph
  }

  // ── Multi-column: distribute the collected lines across columns ──────
  if (hasColumns) {
    const totalH = colLines.reduce((s, l, k) => s + l.height + colGaps[k], 0);
    const fill = frame.columns!.fill ?? 'balance';
    // `balance` (default, CSS default + PowerPoint): even split.
    // `auto`: fill each column to the frame height before the next.
    const targetH = fill === 'auto' ? colHeight : totalH / colCount;
    let cc = 0;
    const cy = new Array(colCount).fill(topPad);
    for (let k = 0; k < colLines.length; k++) {
      const line = colLines[k];
      const atColumnTop = cy[cc] === topPad;
      if (
        cc < colCount - 1 &&
        !atColumnTop &&
        cy[cc] + colGaps[k] + line.height > targetH + 0.01
      ) {
        cc++;
      }
      if (cy[cc] !== topPad) cy[cc] += colGaps[k]; // gaps only between lines
      line.x = cc * (colWidth! + colGap) + leftPad;
      line.y = cy[cc];
      line.columnIndex = cc;
      cy[cc] += line.height;
      allLines.push(line);
      contentWidth = Math.max(contentWidth, line.x + line.width + rightPad);
    }
  }

  // ── Apply vertical alignment per column ──────────────────────────
  if (hasColumns && verticalAlign !== 'top' && frame.height != null) {
    const byColumn: Line[][] = new Array(colCount).fill(null).map(() => []);
    for (const line of allLines) {
      const ci = line.columnIndex ?? 0;
      byColumn[ci].push(line);
    }
    for (let c = 0; c < colCount; c++) {
      applyVerticalAlignment(byColumn[c], colHeight, verticalAlign);
    }
  }

  // ── Compute final content dimensions ─────────────────────────────
  if (hasColumns) {
    // contentWidth = total frame width (includes all columns + gaps + padding)
    contentWidth = frame.width!;
  } else {
    contentWidth += rightPad;
  }

  const lastLine = allLines.length > 0 ? allLines[allLines.length - 1] : null;
  const contentHeight = lastLine
    ? lastLine.y + lastLine.height + bottomPad
    : bottomPad;

  // ── Post-layout rigid transform (writing-mode + rotation) ────────
  // `sideways-rl` turns the block 90° CW, `sideways-lr` 90° CCW (≡ 270° CW);
  // `frame.rotation` adds on top. `lines` / the `contentWidth`×`contentHeight`
  // bbox are in pre-rotation layout space; `content` / `overflow` below are in
  // post-rotation *visual* space so `frame` stays the box the caller gave.
  const wmRotate = sideways ? (writingMode === 'sideways-rl' ? 90 : 270) : 0;
  const rotate = normalizeDeg(wmRotate + (frame.rotation ?? 0));
  const quarterTurned = rotate === 90 || rotate === 270;

  const visualContentWidth = quarterTurned ? contentHeight : contentWidth;
  const visualContentHeight = quarterTurned ? contentWidth : contentHeight;

  const transform: FrameTransform | undefined = rotate === 0
    ? undefined
    : {
        rotate,
        layoutBox: {
          width: (sideways ? frame.height : frame.width) ?? contentWidth,
          height: (sideways ? frame.width : frame.height) ?? contentHeight,
        },
      };

  return {
    lines: allLines,
    content: { width: visualContentWidth, height: visualContentHeight },
    frame: { width: frame.width, height: frame.height },
    overflow: {
      horizontal: frame.width !== undefined && visualContentWidth > frame.width + 0.01,
      vertical: frame.height !== undefined && visualContentHeight > frame.height + 0.01,
    },
    fit: {
      horizontal: frame.width !== undefined ? 'frame' : 'content',
      vertical: frame.height !== undefined ? 'frame' : 'content',
    },
    writingMode,
    ...(transform ? { transform } : {}),
    ...(warnings.length ? { warnings } : {}),
  };
}

// ── Autofit ─────────────────────────────────────────────────────────────

/** Largest run fontSize in the frame (the autofit shrink reference). */
function maxRunFontSize(frame: TextFrame): number {
  let m = 0;
  for (const p of frame.paragraphs)
    for (const r of p.children)
      if (typeof r.fontSize === 'number' && r.fontSize > m) m = r.fontSize;
  return m || (frame.defaultStyle?.fontSize ?? 12);
}

/**
 * Binary-search a single proportional font scale so the content fits the frame,
 * then return that layout with `result.autofit` set. One scale for the whole
 * flow. Shrink-only (scale <= 1).
 */
function runAutofit(
  frame: TextFrame,
  options: LayoutOptions,
  engine: ParagraphLayoutEngine,
): TextFrameLayoutResult {
  const cfg: { minFontSize?: number } =
    options.autofit && typeof options.autofit === 'object'
      ? options.autofit
      : { minFontSize: frame.autofit?.minFontSize };
  const base: LayoutOptions = { ...options, autofit: undefined };

  const fits = (r: TextFrameLayoutResult): boolean =>
    (frame.width == null || r.content.width <= frame.width + 0.5) &&
    (frame.height == null || r.content.height <= frame.height + 0.5);

  const at1 = runFlow(frame, base, engine);
  if (fits(at1)) return { ...at1, autofit: { scale: 1, clampedToMin: false } };

  const minScale = cfg.minFontSize
    ? Math.min(1, Math.max(0.05, cfg.minFontSize / maxRunFontSize(frame)))
    : 0.1;

  let lo = minScale, hi = 1, best: number | null = null, bestResult: TextFrameLayoutResult | null = null;
  for (let i = 0; i < 24 && hi - lo > 0.005; i++) {
    const mid = (lo + hi) / 2;
    const r = runFlow(applyScale(frame, mid), base, engine);
    if (fits(r)) { best = mid; bestResult = r; lo = mid; }
    else hi = mid;
  }

  if (bestResult && best != null) {
    return { ...bestResult, autofit: { scale: Math.round(best * 100) / 100, clampedToMin: false } };
  }
  // Never fit — floor it and report clamped.
  const floored = runFlow(applyScale(frame, minScale), base, engine);
  return { ...floored, autofit: { scale: Math.round(minScale * 100) / 100, clampedToMin: true } };
}
