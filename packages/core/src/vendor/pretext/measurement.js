import { getMeasureContext as __vyazGetMeasureContext } from '../../measure/FontkitMeasureContext.js';
import { isCJK } from './analysis.js';
const segmentMetricCaches = new Map();
let cachedEngineProfile = null;
// Safari's prefix-fit policy is useful for ordinary word-sized runs, but letting
// it measure every growing prefix of a giant segment recreates a pathological
// superlinear prepare-time path. Past this size, switch to the cheaper
// pair-context model and keep the public behavior linear.
const MAX_PREFIX_FIT_GRAPHEMES = 96;
const emojiPresentationRe = /\p{Emoji_Presentation}/u;
const maybeEmojiRe = /[\p{Emoji_Presentation}\p{Extended_Pictographic}\p{Regional_Indicator}\uFE0F\u20E3]/u;
let sharedGraphemeSegmenter = null;
const emojiCorrectionCache = new Map();
export function getMeasureContext() {
    // vendored: delegates to src/measure/FontkitMeasureContext.ts
    return __vyazGetMeasureContext();
}
export function getSegmentMetricCache(font) {
    let cache = segmentMetricCaches.get(font);
    if (!cache) {
        cache = new Map();
        segmentMetricCaches.set(font, cache);
    }
    return cache;
}
export function getSegmentMetrics(seg, cache) {
    let metrics = cache.get(seg);
    if (metrics === undefined) {
        const ctx = getMeasureContext();
        metrics = {
            width: ctx.measureText(seg).width,
            containsCJK: isCJK(seg),
        };
        cache.set(seg, metrics);
    }
    return metrics;
}
export function getEngineProfile() {
    if (cachedEngineProfile !== null)
        return cachedEngineProfile;
    if (typeof navigator === 'undefined') {
        cachedEngineProfile = {
            lineFitEpsilon: 0.005,
            carryCJKAfterClosingQuote: false,
            breakKeepAllAfterPunctuation: true,
            preferPrefixWidthsForBreakableRuns: false,
            preferEarlySoftHyphenBreak: false,
        };
        return cachedEngineProfile;
    }
    const ua = navigator.userAgent;
    const vendor = navigator.vendor;
    const isSafari = vendor === 'Apple Computer, Inc.' &&
        ua.includes('Safari/') &&
        !ua.includes('Chrome/') &&
        !ua.includes('Chromium/') &&
        !ua.includes('CriOS/') &&
        !ua.includes('FxiOS/') &&
        !ua.includes('EdgiOS/');
    const isChromium = ua.includes('Chrome/') ||
        ua.includes('Chromium/') ||
        ua.includes('CriOS/') ||
        ua.includes('Edg/');
    cachedEngineProfile = {
        lineFitEpsilon: isSafari ? 1 / 64 : 0.005,
        carryCJKAfterClosingQuote: isChromium,
        breakKeepAllAfterPunctuation: !isSafari,
        preferPrefixWidthsForBreakableRuns: isSafari,
        preferEarlySoftHyphenBreak: isSafari,
    };
    return cachedEngineProfile;
}
export function parseFontSize(font) {
    const m = font.match(/(\d+(?:\.\d+)?)\s*px/);
    return m ? parseFloat(m[1]) : 16;
}
function getSharedGraphemeSegmenter() {
    if (sharedGraphemeSegmenter === null) {
        sharedGraphemeSegmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    }
    return sharedGraphemeSegmenter;
}
function isEmojiGrapheme(g) {
    return emojiPresentationRe.test(g) || g.includes('\uFE0F');
}
export function textMayContainEmoji(text) {
    return maybeEmojiRe.test(text);
}
function getEmojiCorrection(_font, _fontSize) {
    // vyaz patch: always 0. Upstream compared canvas `measureText` against a DOM
    // `getBoundingClientRect` to undo Chrome/Firefox canvas emoji inflation at
    // small sizes. vyaz measures through fontkit tables (FontkitMeasureContext),
    // which has no such inflation, so there is nothing to correct — and this
    // removes the last `document.*` reference on the measurement path.
    return 0;
}
function countEmojiGraphemes(text) {
    let count = 0;
    const graphemeSegmenter = getSharedGraphemeSegmenter();
    for (const g of graphemeSegmenter.segment(text)) {
        if (isEmojiGrapheme(g.segment))
            count++;
    }
    return count;
}
function getEmojiCount(seg, metrics) {
    if (metrics.emojiCount === undefined) {
        metrics.emojiCount = countEmojiGraphemes(seg);
    }
    return metrics.emojiCount;
}
export function getCorrectedSegmentWidth(seg, metrics, emojiCorrection) {
    if (emojiCorrection === 0)
        return metrics.width;
    return metrics.width - getEmojiCount(seg, metrics) * emojiCorrection;
}
export function getSegmentBreakableFitAdvances(seg, metrics, cache, emojiCorrection, mode) {
    if (metrics.breakableFitAdvances !== undefined && metrics.breakableFitMode === mode) {
        return metrics.breakableFitAdvances;
    }
    metrics.breakableFitMode = mode;
    const graphemeSegmenter = getSharedGraphemeSegmenter();
    const graphemes = [];
    for (const gs of graphemeSegmenter.segment(seg)) {
        graphemes.push(gs.segment);
    }
    if (graphemes.length <= 1) {
        metrics.breakableFitAdvances = null;
        return metrics.breakableFitAdvances;
    }
    if (mode === 'sum-graphemes') {
        const advances = [];
        for (const grapheme of graphemes) {
            const graphemeMetrics = getSegmentMetrics(grapheme, cache);
            advances.push(getCorrectedSegmentWidth(grapheme, graphemeMetrics, emojiCorrection));
        }
        metrics.breakableFitAdvances = advances;
        return metrics.breakableFitAdvances;
    }
    if (mode === 'pair-context' || graphemes.length > MAX_PREFIX_FIT_GRAPHEMES) {
        const advances = [];
        let previousGrapheme = null;
        let previousWidth = 0;
        for (const grapheme of graphemes) {
            const graphemeMetrics = getSegmentMetrics(grapheme, cache);
            const currentWidth = getCorrectedSegmentWidth(grapheme, graphemeMetrics, emojiCorrection);
            if (previousGrapheme === null) {
                advances.push(currentWidth);
            }
            else {
                const pair = previousGrapheme + grapheme;
                const pairMetrics = getSegmentMetrics(pair, cache);
                advances.push(getCorrectedSegmentWidth(pair, pairMetrics, emojiCorrection) - previousWidth);
            }
            previousGrapheme = grapheme;
            previousWidth = currentWidth;
        }
        metrics.breakableFitAdvances = advances;
        return metrics.breakableFitAdvances;
    }
    const advances = [];
    let prefix = '';
    let prefixWidth = 0;
    for (const grapheme of graphemes) {
        prefix += grapheme;
        const prefixMetrics = getSegmentMetrics(prefix, cache);
        const nextPrefixWidth = getCorrectedSegmentWidth(prefix, prefixMetrics, emojiCorrection);
        advances.push(nextPrefixWidth - prefixWidth);
        prefixWidth = nextPrefixWidth;
    }
    metrics.breakableFitAdvances = advances;
    return metrics.breakableFitAdvances;
}
export function getFontMeasurementState(font, needsEmojiCorrection) {
    const ctx = getMeasureContext();
    ctx.font = font;
    const cache = getSegmentMetricCache(font);
    const fontSize = parseFontSize(font);
    const emojiCorrection = needsEmojiCorrection ? getEmojiCorrection(font, fontSize) : 0;
    return { cache, fontSize, emojiCorrection };
}
export function clearMeasurementCaches() {
    segmentMetricCaches.clear();
    emojiCorrectionCache.clear();
    sharedGraphemeSegmenter = null;
}
