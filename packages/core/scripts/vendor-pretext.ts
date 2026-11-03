/**
 * vendor-pretext.ts — regenerate src/vendor/pretext/ from @chenglou/pretext.
 *
 * Why vendor at all
 * ----------------
 * pretext measures text through a canvas 2d context it makes itself —
 * `createContext()` in measurement.js — and there is no injection seam
 * (module-private measure state, no setter). The alternatives to vendoring
 * are all worse for us:
 *
 *   - polyfilling globalThis.document / OffscreenCanvas / patching
 *     CanvasRenderingContext2D.prototype — global runtime mutation, breaks
 *     other canvas consumers, races in worker threads;
 *   - `bun patch` / patch-package — package-manager specific, and we ship to
 *     both bun and npm consumers;
 *   - a bundler resolve plugin — does not cover the `"bun": "./src/index.ts"`
 *     export condition, where consumers run our TypeScript unbundled.
 *
 * So: copy the published `dist/` verbatim and rewrite the context factory to
 * hand out our own measure context, plus the few places where pretext reads
 * the browser it runs in (see MEASUREMENT_PATCHES).
 *
 * Why dist/ and not src/
 * ----------------------
 *   - packages/core has `isolatedDeclarations: true`; third-party TS will not
 *     satisfy it;
 *   - pretext builds with TypeScript 7.x, this repo is on 5.x;
 *   - dist/ already ships .d.ts, so the vendored code needs no compilation at
 *     all — tsc reads the declarations, bun bundles/executes the JavaScript.
 *
 * Upgrading
 * ---------
 *   bun add -d @chenglou/pretext@<version>
 *   bun run vendor:pretext
 *   git diff src/vendor/pretext        # review
 *
 * Every rewrite below is anchored on an exact source string and asserted. If
 * upstream touches the measurement seam the script fails loudly rather than
 * silently emitting a build that measures text with the wrong backend.
 */

import { mkdir, readdir, readFile, rm, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, relative } from 'node:path';
import { TEXT_PATCHES, TEXT_PATCH_NOTES, type TextPatch } from './vendor-pretext-text-patches.ts';

const PKG = 'node_modules/@chenglou/pretext';
const OUT = 'src/vendor/pretext';

/** Import specifier the vendored measurement.js delegates to. */
const SEAM_IMPORT =
  "import { createMeasureContextProxy as __vyazCreateMeasureContext, getMeasureProfileKey as __vyazGetMeasureProfileKey } from '../../measure/FontkitMeasureContext.js';\n";

/**
 * The measurement seam. pretext 1.0 makes a context per measure state (and a
 * second one for whole-run kana probes) and talks to it like a canvas: `font`,
 * `measureText()`, `fontKerning`, `lang`. vyaz hands it a proxy onto the
 * installed fontkit context instead.
 */
const MEASUREMENT_PATCHES: TextPatch[] = [
  {
    file: 'measurement.js',
    where: 'measurement.js (createContext)',
    anchor: `function createContext(language) {
    // jsdom and happy-dom have a document whose canvas gives no 2D context: getContext() returns null there.
    let context = null;
    if (typeof OffscreenCanvas !== 'undefined')
        context = new OffscreenCanvas(1, 1).getContext('2d');
    else if (typeof document !== 'undefined')
        context = document.createElement('canvas').getContext('2d');
    if (context === null)
        throw new Error('Text measurement requires OffscreenCanvas or a DOM canvas context.');`,
    replacement: `function createContext(language) {
    // vendored: measure through src/measure/FontkitMeasureContext.ts, never a canvas.
    // The proxy forwards to whatever context is installed at the time of each call.
    const context = __vyazCreateMeasureContext();`,
  },
  {
    // Upstream keys its per-font measurements by \`font\` alone — one canvas, one
    // way to measure. vyaz measures the same font differently per measure
    // profile, so the profile becomes part of the key: widths never cross-feed,
    // and a profile switch (every \`mode: 'office'\` layout) does not flush them.
    file: 'measurement.js',
    where: 'measurement.js (font measurement cache key)',
    anchor: `    let measurement = fonts.get(font);
    if (measurement === undefined) {`,
    replacement: `    // vendored: upstream keys this cache by \`font\` alone. vyaz measures the
    // same font differently per measure profile (advance / shape, kerning
    // threshold, advance grid, optical sizing), so the profile is part of the key.
    const fontKey = __vyazGetMeasureProfileKey() + font;
    let measurement = fonts.get(fontKey);
    if (measurement === undefined) {`,
  },
  {
    file: 'measurement.js',
    where: 'measurement.js (font measurement cache store)',
    anchor: '        fonts.set(font, measurement);',
    replacement: '        fonts.set(fontKey, measurement);',
  },
  {
    // Layout must not depend on the page it runs in: the same document lays out
    // the same in Bun, Node and every browser. Upstream reads \`<html lang>\`.
    file: 'measurement.js',
    where: 'measurement.js (getPreparationLanguage)',
    anchor: `    let language = localeLanguage ?? null;
    if (localeLanguage === undefined && typeof document !== 'undefined') {
        const lang = document.documentElement?.lang;
        if (typeof lang === 'string')
            language = lang;
    }`,
    replacement: `    // vendored: the page's <html lang> is not read — layout must not depend on
    // the page it runs in. setLocale() still sets a language.
    const language = localeLanguage ?? null;`,
  },
  {
    // Upstream picks Chrome's, Safari's or Firefox's rules from the user agent,
    // to match the browser's own canvas and layout. vyaz measures with fontkit,
    // not that canvas, and must lay out identically everywhere: always Blink,
    // which is also what upstream does outside a browser.
    file: 'measurement.js',
    where: 'measurement.js (buildEngineProfile)',
    anchor: "    const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent ?? '';",
    replacement: `    // vendored: always Blink's profile, whatever runtime vyaz is in — the user
    // agent describes the browser's canvas, which vyaz does not measure with.
    const ua = '';`,
  },
  {
    // The correction undoes canvas emoji inflation, read off a DOM span; the
    // fontkit backend has neither.
    file: 'measurement.js',
    where: 'measurement.js (getEmojiCorrection)',
    anchor: 'export function getEmojiCorrection(font, measurement) {',
    replacement: `export function getEmojiCorrection(font, measurement) {
    // vendored: fontkit has no canvas emoji inflation to correct, and no DOM to read.
    return 0;
}
// vendored: upstream's getEmojiCorrection, unused.
export function upstreamGetEmojiCorrection(font, measurement) {`,
  },
];

/**
 * `overflow-wrap: normal` support.
 *
 * Upstream pretext targets a fixed CSS profile — `overflow-wrap: break-word`
 * unconditionally (see README, Caveats) — so any word wider than the available
 * width is *always* sliced at grapheme boundaries, with no option to opt out.
 * Real browsers and PowerPoint default to `overflow-wrap: normal`: an
 * unbreakable word instead overflows the line. We add that missing mode as an
 * `overflowWrap` option of `prepare()` / `prepareRichInline()`, threaded into
 * measureAnalysis()'s `overflowBreaks` flag, which already turns the
 * emergency grapheme breaks off for atomic rich items.
 */
const OVERFLOW_WRAP_PATCHES: TextPatch[] = [
  {
    file: 'layout.js',
    where: 'layout.js (prepareInternal)',
    anchor: `    const analysis = analyzeText(text, engineProfile, options?.whiteSpace, wordBreak, language);
    return measureAnalysis(analysis, 0, analysis.flags.length, font, includeSegments, letterSpacing, engineProfile, language, true, null);`,
    replacement: `    // vendored: \`overflowWrap\` (default 'normal', the real CSS default) and
    // \`hyphenBreak\` (default true) — upstream has neither, see VENDOR.json.
    const overflowBreaks = (options?.overflowWrap ?? 'normal') !== 'normal';
    const analysis = analyzeText(text, engineProfile, options?.whiteSpace, wordBreak, language, null, options?.hyphenBreak !== false);
    return measureAnalysis(analysis, 0, analysis.flags.length, font, includeSegments, letterSpacing, engineProfile, language, overflowBreaks, null);`,
  },
  {
    file: 'layout.d.ts',
    where: 'layout.d.ts (PrepareOptions)',
    anchor: `export type PrepareOptions = {
    whiteSpace?: WhiteSpaceMode;
    wordBreak?: WordBreakMode;
    letterSpacing?: number;
};`,
    replacement: `export type OverflowWrapMode = 'normal' | 'break-word' | 'anywhere';
export type PrepareOptions = {
    whiteSpace?: WhiteSpaceMode;
    wordBreak?: WordBreakMode;
    letterSpacing?: number;
    /** CSS \`overflow-wrap\`. Default \`'normal'\` — a word wider than the line
     *  overflows instead of being sliced at grapheme boundaries.
     *  \`'break-word'\` / \`'anywhere'\` restore upstream's unconditional
     *  long-word grapheme fallback. */
    overflowWrap?: OverflowWrapMode;
    /** Break after '-' / U+2010 inside a word. Default \`true\` (upstream). */
    hyphenBreak?: boolean;
};`,
  },
  {
    file: 'rich-inline.js',
    where: 'rich-inline.js (prepareRichInline options)',
    anchor: `    const wordBreak = options?.wordBreak ?? 'normal';
    const preserve = whiteSpace === 'pre-wrap';`,
    replacement: `    const wordBreak = options?.wordBreak ?? 'normal';
    const preserve = whiteSpace === 'pre-wrap';
    // vendored: \`overflowWrap\` (default 'normal') and \`hyphenBreak\` (default
    // true) — upstream has neither, see VENDOR.json.
    const overflowBreaks = (options?.overflowWrap ?? 'normal') !== 'normal';
    const hyphenBreak = options?.hyphenBreak !== false;`,
  },
  {
    file: 'rich-inline.js',
    where: 'rich-inline.js (one-item paragraph)',
    anchor: `        const analysis = analyzeText(only.text, profile, whiteSpace, wordBreak, language);
        const data = measureAnalysis(analysis, 0, analysis.flags.length, only.font, true, readLetterSpacing(only.letterSpacing, profile), profile, language, true, null);`,
    replacement: `        const analysis = analyzeText(only.text, profile, whiteSpace, wordBreak, language, null, hyphenBreak);
        const data = measureAnalysis(analysis, 0, analysis.flags.length, only.font, true, readLetterSpacing(only.letterSpacing, profile), profile, language, overflowBreaks, null);`,
  },
  {
    file: 'rich-inline.js',
    where: 'rich-inline.js (paragraph analysis)',
    anchor: '    const analysis = analyzeText(source, profile, whiteSpace, wordBreak, language, paragraph);',
    replacement: '    const analysis = analyzeText(source, profile, whiteSpace, wordBreak, language, paragraph, hyphenBreak);',
  },
  {
    file: 'rich-inline.js',
    where: 'rich-inline.js (item measurement)',
    anchor: '        const sub = measureAnalysis(analysis, from, to, item.font, false, letterSpacing, profile, language, true, lists);',
    replacement: '        const sub = measureAnalysis(analysis, from, to, item.font, false, letterSpacing, profile, language, overflowBreaks, lists);',
  },
  {
    file: 'rich-inline.d.ts',
    where: 'rich-inline.d.ts (RichInlineOptions)',
    anchor: `import type { LayoutCursor, WordBreakMode } from './layout.js';`,
    replacement: `import type { LayoutCursor, OverflowWrapMode, WordBreakMode } from './layout.js';`,
  },
  {
    file: 'rich-inline.d.ts',
    where: 'rich-inline.d.ts (RichInlineOptions fields)',
    anchor: `export type RichInlineOptions = {
    whiteSpace?: WhiteSpaceMode;
    wordBreak?: WordBreakMode;
};`,
    replacement: `export type RichInlineOptions = {
    whiteSpace?: WhiteSpaceMode;
    wordBreak?: WordBreakMode;
    /** CSS \`overflow-wrap\` of the paragraph. Default \`'normal'\`. */
    overflowWrap?: OverflowWrapMode;
    /** Break after '-' / U+2010 inside a word. Default \`true\`. */
    hyphenBreak?: boolean;
};`,
  },
];

function fail(message: string): never {
  console.error(`\n  vendor-pretext: ${message}\n`);
  process.exit(1);
}

/** Replace `anchor` exactly once, or fail. */
function replaceOnce(source: string, anchor: string, replacement: string, where: string): string {
  const first = source.indexOf(anchor);
  if (first === -1) {
    fail(
      `anchor not found in ${where}.\n` +
        `  Upstream changed the patched code — re-read it and update the anchor.\n` +
        `  Expected:\n${anchor.split('\n').map((l) => `    ${l}`).join('\n')}`,
    );
  }
  if (source.indexOf(anchor, first + anchor.length) !== -1) {
    fail(`anchor matched more than once in ${where}; it is no longer unique.`);
  }
  return source.slice(0, first) + replacement + source.slice(first + anchor.length);
}

/**
 * Copy dist/ across, minus the declaration source maps: they point at pretext's
 * own .ts files, which we deliberately do not vendor, so an editor following
 * them lands on nothing. The trailing sourceMappingURL comments go with them.
 */
async function copyTree(from: string, to: string, files: string[]): Promise<void> {
  for (const entry of await readdir(from, { withFileTypes: true })) {
    const src = join(from, entry.name);
    const dst = join(to, entry.name);

    if (entry.isDirectory()) {
      await mkdir(dst, { recursive: true });
      await copyTree(src, dst, files);
      continue;
    }

    if (entry.name.endsWith('.d.ts.map')) continue;

    await mkdir(dirname(dst), { recursive: true });
    if (entry.name.endsWith('.d.ts')) {
      const text = await readFile(src, 'utf8');
      await writeFile(dst, text.replace(/\n?\/\/# sourceMappingURL=.*\.map\s*$/, '\n'));
    } else {
      await writeFile(dst, await readFile(src));
    }
    files.push(relative(OUT, dst));
  }
}

async function main(): Promise<void> {
  try {
    await stat(PKG);
  } catch {
    fail(`${PKG} not found. Run \`bun install\` first.`);
  }

  const manifest = JSON.parse(await readFile(join(PKG, 'package.json'), 'utf8')) as {
    name: string;
    version: string;
  };

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const files: string[] = [];
  await copyTree(join(PKG, 'dist'), OUT, files);

  // MIT, plus the Chromium / WebKit / ICU notices — keep them next to the code they cover.
  await writeFile(join(OUT, 'LICENSE'), await readFile(join(PKG, 'LICENSE')));
  files.push('LICENSE');

  // ── the rewrites: measurement seam, overflow-wrap, hyphen breaks ───────
  for (const patch of [...MEASUREMENT_PATCHES, ...OVERFLOW_WRAP_PATCHES, ...TEXT_PATCHES]) {
    const path = join(OUT, patch.file);
    await writeFile(path, replaceOnce(await readFile(path, 'utf8'), patch.anchor, patch.replacement, patch.where));
  }
  const measurementPath = join(OUT, 'measurement.js');
  await writeFile(measurementPath, SEAM_IMPORT + (await readFile(measurementPath, 'utf8')));

  // ── provenance stamp ─────────────────────────────────────────────────
  const hashes: Record<string, string> = {};
  for (const rel of files.sort()) {
    const bytes = await readFile(join(OUT, rel));
    hashes[rel] = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  }

  const BASE_NOTES: Record<string, string> = {
    'measurement.js': "createContext() hands out a proxy onto ../../measure/FontkitMeasureContext.ts instead of a canvas; per-font measurements keyed by measure profile + font; <html lang> not read; engine profile always Blink (no user-agent sniffing); getEmojiCorrection() returns 0 (fontkit has no canvas emoji inflation)",
    'layout.js': "prepare() gets `overflowWrap` (default 'normal', the real CSS default) gating the emergency grapheme breaks — upstream hardcodes 'overflow-wrap: break-word' — and forwards `hyphenBreak` to analyzeText()",
    'layout.d.ts': 'PrepareOptions gets overflowWrap?: OverflowWrapMode, hyphenBreak?: boolean',
    'rich-inline.js': 'prepareRichInline() options get overflowWrap / hyphenBreak, forwarded as in prepare()',
    'rich-inline.d.ts': 'RichInlineOptions gets overflowWrap?: OverflowWrapMode, hyphenBreak?: boolean',
  };
  await writeFile(
    join(OUT, 'VENDOR.json'),
    JSON.stringify(
      {
        note: 'Generated by scripts/vendor-pretext.ts — do not edit by hand.',
        upstream: `${manifest.name}@${manifest.version}`,
        generatedFrom: 'dist/',
        patched: {
          ...BASE_NOTES,
          ...Object.fromEntries(Object.entries(TEXT_PATCH_NOTES).map(([file, note]) => [file, file in BASE_NOTES ? `${BASE_NOTES[file]}; ${note}` : note])),
        },
        files: hashes,
      },
      null,
      2,
    ) + '\n',
  );

  console.log(`vendored ${manifest.name}@${manifest.version} → ${OUT} (${files.length} files)`);
}

await main();
