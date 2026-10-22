/**
 * vendor-pretext-text-patches.ts — the white-space / hyphen rewrites of the
 * vendored pretext, applied by `vendor-pretext.ts` after its other patches
 * (anchors below match the already-patched text).
 *
 *   - rich-inline.js: `RichInlineItem.whiteSpace: 'pre-wrap'` keeps an item's
 *     own spaces (no boundary trimming, no collapsed gap; the space it ends
 *     with is the break opportunity before the next item) and forwards
 *     `whiteSpace` / `hyphenBreak` into prepareWithSegments(). Upstream
 *     rich-inline is CSS `white-space: normal` only.
 *   - analysis.js / layout.js: a `hyphenBreak` option (default `true`, as
 *     upstream); `false` glues a text segment ending in `-` / U+2010 to the
 *     text after it, so no line breaks after the hyphen.
 */

export interface TextPatch {
  file: string;
  anchor: string;
  replacement: string;
  where: string;
}

export const TEXT_PATCHES: TextPatch[] = [
  {
    file: 'analysis.js',
    where: 'analysis.js (analyzeText signature + mergeHyphenatedTextRuns)',
    anchor: `export function analyzeText(text, profile, whiteSpace = 'normal', wordBreak = 'normal') {
    const whiteSpaceProfile = getWhiteSpaceProfile(whiteSpace);`,
    replacement: `// vendored: \`hyphenBreak: false\` — glue a text segment that ends in a hyphen
// to the text segment after it, so no line breaks there. Upstream always
// breaks after '-' / U+2010, like browsers (and PowerPoint) do.
function mergeHyphenatedTextRuns(segmentation) {
    const texts = [];
    const isWordLike = [];
    const kinds = [];
    const starts = [];
    for (let i = 0; i < segmentation.len; i++) {
        const text = segmentation.texts[i];
        const last = texts.length - 1;
        if (last >= 0 &&
            segmentation.kinds[i] === 'text' &&
            kinds[last] === 'text' &&
            /[-\\u2010]$/.test(texts[last])) {
            texts[last] += text;
            isWordLike[last] = isWordLike[last] || segmentation.isWordLike[i];
            continue;
        }
        texts.push(text);
        isWordLike.push(segmentation.isWordLike[i]);
        kinds.push(segmentation.kinds[i]);
        starts.push(segmentation.starts[i]);
    }
    return { len: texts.length, texts, isWordLike, kinds, starts };
}
export function analyzeText(text, profile, whiteSpace = 'normal', wordBreak = 'normal', hyphenBreak = true) {
    const whiteSpaceProfile = getWhiteSpaceProfile(whiteSpace);`,
  },
  {
    file: 'analysis.js',
    where: 'analysis.js (analyzeText hyphenBreak pass)',
    anchor: `    const segmentation = wordBreak === 'keep-all'
        ? mergeKeepAllTextSegments(normalized, mergedSegmentation, profile.breakKeepAllAfterPunctuation)
        : mergedSegmentation;`,
    replacement: `    const segmented = wordBreak === 'keep-all'
        ? mergeKeepAllTextSegments(normalized, mergedSegmentation, profile.breakKeepAllAfterPunctuation)
        : mergedSegmentation;
    const segmentation = hyphenBreak ? segmented : mergeHyphenatedTextRuns(segmented);`,
  },
  {
    file: 'analysis.d.ts',
    where: 'analysis.d.ts (analyzeText)',
    anchor: 'export declare function analyzeText(text: string, profile: AnalysisProfile, whiteSpace?: WhiteSpaceMode, wordBreak?: WordBreakMode): TextAnalysis;',
    replacement: 'export declare function analyzeText(text: string, profile: AnalysisProfile, whiteSpace?: WhiteSpaceMode, wordBreak?: WordBreakMode, hyphenBreak?: boolean): TextAnalysis;',
  },
  {
    file: 'layout.js',
    where: 'layout.js (prepareInternal hyphenBreak)',
    anchor: `    const analysis = analyzeText(text, getEngineProfile(), options?.whiteSpace, wordBreak);
    return measureAnalysis(analysis, font, includeSegments, wordBreak, letterSpacing, overflowWrap);`,
    replacement: `    // vendored: \`hyphenBreak\` (default true) — see analyzeText().
    const analysis = analyzeText(text, getEngineProfile(), options?.whiteSpace, wordBreak, options?.hyphenBreak !== false);
    return measureAnalysis(analysis, font, includeSegments, wordBreak, letterSpacing, overflowWrap);`,
  },
  {
    file: 'layout.d.ts',
    where: 'layout.d.ts (PrepareOptions.hyphenBreak)',
    anchor: `    overflowWrap?: OverflowWrapMode;
};`,
    replacement: `    overflowWrap?: OverflowWrapMode;
    /** Break after '-' / U+2010 inside a word. Default \`true\` (upstream). */
    hyphenBreak?: boolean;
};`,
  },
  {
    file: 'rich-inline.js',
    where: 'rich-inline.js (pre-wrap items, hyphenBreak)',
    anchor: `        const letterSpacing = item.letterSpacing ?? 0;
        const hasLeadingWhitespace = LEADING_COLLAPSIBLE_BOUNDARY_RE.test(item.text);
        const hasTrailingWhitespace = TRAILING_COLLAPSIBLE_BOUNDARY_RE.test(item.text);
        const trimmedText = item.text
            .replace(LEADING_COLLAPSIBLE_BOUNDARY_RE, '')
            .replace(TRAILING_COLLAPSIBLE_BOUNDARY_RE, '');
        if (trimmedText.length === 0) {
            if (COLLAPSIBLE_BOUNDARY_RE.test(item.text) && pendingGapWidth === 0) {`,
    replacement: `        const letterSpacing = item.letterSpacing ?? 0;
        // vendored: a \`whiteSpace: 'pre-wrap'\` item keeps its own spaces — no
        // boundary trimming, no collapsed gap; they are segments of the item.
        const preserveSpaces = item.whiteSpace === 'pre-wrap';
        const hasLeadingWhitespace = !preserveSpaces && LEADING_COLLAPSIBLE_BOUNDARY_RE.test(item.text);
        const hasTrailingWhitespace = !preserveSpaces && TRAILING_COLLAPSIBLE_BOUNDARY_RE.test(item.text);
        const trimmedText = preserveSpaces ? item.text : item.text
            .replace(LEADING_COLLAPSIBLE_BOUNDARY_RE, '')
            .replace(TRAILING_COLLAPSIBLE_BOUNDARY_RE, '');
        if (trimmedText.length === 0) {
            if (!preserveSpaces && COLLAPSIBLE_BOUNDARY_RE.test(item.text) && pendingGapWidth === 0) {`,
  },
  {
    file: 'rich-inline.js',
    where: 'rich-inline.js (prepare options)',
    anchor: `        const prepareOptions = letterSpacing === 0 && item.overflowWrap === undefined
            ? undefined
            : { letterSpacing, overflowWrap: item.overflowWrap };`,
    replacement: `        const prepareOptions = letterSpacing === 0 && item.overflowWrap === undefined && !preserveSpaces && item.hyphenBreak !== false
            ? undefined
            : {
                letterSpacing,
                overflowWrap: item.overflowWrap,
                ...(preserveSpaces ? { whiteSpace: 'pre-wrap' } : {}),
                ...(item.hyphenBreak === false ? { hyphenBreak: false } : {}),
            };`,
  },
  {
    file: 'rich-inline.js',
    where: 'rich-inline.js (prepared item remembers pre-wrap)',
    anchor: `            prepared,
            sourceItemIndex: index,
        };`,
    replacement: `            prepared,
            sourceItemIndex: index,
            preserveSpaces,
        };`,
  },
  {
    file: 'rich-inline.js',
    where: 'rich-inline.js (trailingHangingWidth helper)',
    anchor: 'function endsInsideFirstSegment(segmentIndex, graphemeIndex) {',
    replacement: `// vendored: width of the spaces a pre-wrap item ends a line with — they hang
// past the line end (CSS pre-wrap, PowerPoint), so they don't count for fit.
function trailingHangingWidth(prepared, start, end) {
    if (end.graphemeIndex !== 0)
        return 0;
    let width = 0;
    for (let k = end.segmentIndex - 1; k >= start.segmentIndex; k--) {
        const kind = prepared.kinds[k];
        if (kind !== 'preserved-space' && kind !== 'space')
            break;
        width += prepared.widths[k];
    }
    return width;
}
function endsInsideFirstSegment(segmentIndex, graphemeIndex) {`,
  },
  {
    file: 'rich-inline.js',
    where: 'rich-inline.js (hanging spaces do not count for fit)',
    anchor: `        if (lineWidth > 0 && atItemStart && lineWidthContribution > remainingWidth)
            break lineLoop;`,
    replacement: `        const hangingWidth = item.preserveSpaces ? trailingHangingWidth(item.prepared, cursor, lineEnd) : 0;
        if (lineWidth > 0 && atItemStart && lineWidthContribution - hangingWidth > remainingWidth)
            break lineLoop;`,
  },
  {
    file: 'rich-inline.js',
    where: 'rich-inline.js (prepared item remembers a trailing pre-wrap space)',
    anchor: `            sourceItemIndex: index,
            preserveSpaces,
        };`,
    replacement: `            sourceItemIndex: index,
            preserveSpaces,
            endsWithSpace: preserveSpaces && /\\s$/.test(trimmedText),
        };`,
  },
  {
    file: 'rich-inline.js',
    where: 'rich-inline.js (wrap before an item after a pre-wrap space)',
    anchor: `            gapBefore > 0 &&
            endsInsideFirstSegment(lineEnd.segmentIndex, lineEnd.graphemeIndex)) {`,
    replacement: `            // vendored: a pre-wrap item keeps the space it ends with, so the
            // break opportunity before this item is that space, not gapBefore
            (gapBefore > 0 || (itemIndex > 0 && flow.items[itemIndex - 1].endsWithSpace)) &&
            endsInsideFirstSegment(lineEnd.segmentIndex, lineEnd.graphemeIndex)) {`,
  },
  {
    file: 'rich-inline.d.ts',
    where: 'rich-inline.d.ts (RichInlineItem.whiteSpace / hyphenBreak)',
    anchor: `    overflowWrap?: OverflowWrapMode;
};`,
    replacement: `    overflowWrap?: OverflowWrapMode;
    /** \`'pre-wrap'\` keeps this item's spaces (no trimming, no collapsed gap). Default \`'normal'\`. */
    whiteSpace?: 'normal' | 'pre-wrap';
    /** Break after '-' / U+2010 inside a word. Default \`true\`. */
    hyphenBreak?: boolean;
};`,
  },
];

/** Notes merged into VENDOR.json `patched`. */
export const TEXT_PATCH_NOTES: Record<string, string> = {
  'analysis.js': 'analyzeText() gets a hyphenBreak flag (default true); false glues text segments split after a hyphen',
  'analysis.d.ts': 'analyzeText() gets hyphenBreak?: boolean',
  'layout.js': 'prepareInternal() forwards options.hyphenBreak',
  'layout.d.ts': 'PrepareOptions gets hyphenBreak?: boolean',
  'rich-inline.js': "a whiteSpace: 'pre-wrap' item keeps its spaces (trailing ones hang: they don't count for fit, and a line wraps before the next item rather than splitting its first word); forwards whiteSpace / hyphenBreak into prepareWithSegments()",
  'rich-inline.d.ts': "RichInlineItem gets whiteSpace?: 'normal' | 'pre-wrap', hyphenBreak?: boolean",
};
