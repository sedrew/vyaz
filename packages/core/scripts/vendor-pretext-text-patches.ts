/**
 * vendor-pretext-text-patches.ts — the hyphen-break rewrite of the vendored
 * pretext, applied by `vendor-pretext.ts` after its other patches (anchors
 * below match the already-patched text).
 *
 *   - analysis.js: an `analyzeText()` `hyphenBreak` flag (default `true`, as
 *     upstream); `false` drops the line breaker's break opportunities right
 *     after '-' / U+2010 before more text, so no line breaks after the hyphen.
 *     `prepare()` and `prepareRichInline()` forward their `hyphenBreak` option
 *     (see the overflow-wrap patches in vendor-pretext.ts).
 *
 * pretext 1.0 lays rich-inline items out as one paragraph and takes
 * `whiteSpace: 'pre-wrap'` itself, so the per-item pre-wrap rewrites this file
 * used to carry for 0.0.8 are gone.
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
    where: 'analysis.js (analyzeText hyphenBreak parameter)',
    anchor: `// The items of the rich-inline paragraph whose text this is, else null.
paragraph = null) {`,
    replacement: `// The items of the rich-inline paragraph whose text this is, else null.
paragraph = null,
// vendored: \`hyphenBreak: false\` — no line break after '-' / U+2010 (dropHyphenBreaks).
hyphenBreak = true) {`,
  },
  {
    file: 'analysis.js',
    where: 'analysis.js (analyzeText hyphenBreak pass)',
    anchor: `        markItemStarts(text, normalized, breaks, paragraph, profile.lineBreakScan);
    return segmentAtLineBreaks(`,
    replacement: `        markItemStarts(text, normalized, breaks, paragraph, profile.lineBreakScan);
    if (!hyphenBreak)
        dropHyphenBreaks(normalized, breaks);
    return segmentAtLineBreaks(`,
  },
  {
    file: 'analysis.js',
    where: 'analysis.js (dropHyphenBreaks helper)',
    anchor: 'export function analyzeText(text, profile, ',
    replacement: `// vendored: \`hyphenBreak: false\` — drop the break opportunities right after a
// hyphen ('-' / U+2010) that more text follows, so a hyphenated word or code
// stays on one line. Upstream always breaks there, like browsers (and
// PowerPoint) do. A forced break stays.
function dropHyphenBreaks(normalized, breaks) {
    for (let i = 1; i < normalized.length; i++) {
        const before = normalized.charCodeAt(i - 1);
        if ((before === 0x2D || before === 0x2010) && (breaks[i] & FORCED_BREAK) === 0 && !isCollapsibleSpaceCode(normalized.charCodeAt(i)))
            breaks[i] = breaks[i] & ~BREAK;
    }
}
export function analyzeText(text, profile, `,
  },
  {
    file: 'analysis.d.ts',
    where: 'analysis.d.ts (analyzeText)',
    anchor: 'export declare function analyzeText(text: string, profile: AnalysisProfile, whiteSpace?: WhiteSpaceMode, wordBreak?: WordBreakMode, language?: string | null, paragraph?: ParagraphItems | null): TextAnalysis;',
    replacement: 'export declare function analyzeText(text: string, profile: AnalysisProfile, whiteSpace?: WhiteSpaceMode, wordBreak?: WordBreakMode, language?: string | null, paragraph?: ParagraphItems | null, hyphenBreak?: boolean): TextAnalysis;',
  },
];

/** Notes merged into VENDOR.json `patched`. */
export const TEXT_PATCH_NOTES: Record<string, string> = {
  'analysis.js': 'analyzeText() gets a hyphenBreak flag (default true); false drops the break opportunities right after - / U+2010',
  'analysis.d.ts': 'analyzeText() gets hyphenBreak?: boolean',
};
