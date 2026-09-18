/**
 * vendor-pretext.ts — regenerate src/vendor/pretext/ from @chenglou/pretext.
 *
 * Why vendor at all
 * ----------------
 * pretext reaches for a canvas 2d context in exactly one place —
 * `getMeasureContext()` in measurement.js — and there is no injection seam
 * (module-private `measureContext`, no setter). The alternatives to vendoring
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
 * So: copy the published `dist/` verbatim and rewrite that one function to
 * delegate to our own measure context.
 *
 * Why dist/ and not src/
 * ----------------------
 *   - packages/core has `isolatedDeclarations: true`; third-party TS will not
 *     satisfy it;
 *   - pretext builds with TypeScript 6.x, this repo is on 5.x;
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

const PKG = 'node_modules/@chenglou/pretext';
const OUT = 'src/vendor/pretext';

/** Import specifier the vendored measurement.js delegates to. */
const SEAM_IMPORT =
  "import { getMeasureContext as __vyazGetMeasureContext } from '../../measure/FontkitMeasureContext.js';\n";

/**
 * Exact upstream body of measurement.js `getMeasureContext()` as emitted by
 * pretext's tsc build. Anchored verbatim — see the header note on failing loud.
 */
const JS_ANCHOR = `export function getMeasureContext() {
    if (measureContext !== null)
        return measureContext;
    if (typeof OffscreenCanvas !== 'undefined') {
        measureContext = new OffscreenCanvas(1, 1).getContext('2d');
        return measureContext;
    }
    if (typeof document !== 'undefined') {
        measureContext = document.createElement('canvas').getContext('2d');
        return measureContext;
    }
    throw new Error('Text measurement requires OffscreenCanvas or a DOM canvas context.');
}`;

/**
 * Replacement. Delegation is lazy — resolved on first call, not at module
 * init — so there is no installation order to get wrong and no window in
 * which a worker thread can measure through the wrong backend.
 */
const JS_REPLACEMENT = `export function getMeasureContext() {
    // vendored: delegates to src/measure/FontkitMeasureContext.ts
    return __vyazGetMeasureContext();
}`;

const DTS_ANCHOR =
  'export declare function getMeasureContext(): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;';

const DTS_REPLACEMENT =
  'export declare function getMeasureContext(): { font: string; measureText(text: string): { width: number } };';

/** `measureContext` is now unused in the vendored file; drop the dead binding. */
const DEAD_STATE_ANCHOR = 'let measureContext = null;\n';

/**
 * Second rewrite: `overflow-wrap: normal` support.
 *
 * Upstream pretext targets a fixed CSS profile — `overflow-wrap: break-word`
 * unconditionally (see README / github.com/chenglou/pretext#206) — so any
 * word wider than the available width is *always* sliced at grapheme
 * boundaries, with no option to opt out. Real browsers and PowerPoint default
 * to `overflow-wrap: normal`: an unbreakable word instead overflows the line.
 * We add that missing mode as a new `overflowWrap` option, threaded from
 * `prepare()`/`prepareWithSegments()` down to the one call site that decides
 * whether a word-like segment may be broken mid-word.
 */
const OVERFLOW_WRAP_JS_SIGNATURE_ANCHOR =
  'function measureAnalysis(analysis, font, includeSegments, wordBreak, letterSpacing) {';
const OVERFLOW_WRAP_JS_SIGNATURE_REPLACEMENT =
  'function measureAnalysis(analysis, font, includeSegments, wordBreak, letterSpacing, overflowWrap) {';

const OVERFLOW_WRAP_JS_CALLSITE_ANCHOR =
  '        pushMeasuredTextSegment(segText, segKind, segStart, segWordLike, true);';
const OVERFLOW_WRAP_JS_CALLSITE_REPLACEMENT = `        // vendored: upstream always allowed overflow breaks here (hardcoded
        // \`true\`, i.e. \`overflow-wrap: break-word\` unconditionally — see
        // VENDOR.json). Gate it on the caller's actual \`overflowWrap\` /
        // \`wordBreak\` instead, so \`overflow-wrap: normal\` (the real CSS
        // default) lets an atomic word overflow the line instead of being
        // sliced at grapheme boundaries.
        pushMeasuredTextSegment(segText, segKind, segStart, segWordLike, overflowWrap !== 'normal' || wordBreak === 'break-all');`;

const OVERFLOW_WRAP_JS_PREPARE_ANCHOR = `function prepareInternal(text, font, includeSegments, options) {
    const wordBreak = options?.wordBreak ?? 'normal';
    const letterSpacing = options?.letterSpacing ?? 0;
    const analysis = analyzeText(text, getEngineProfile(), options?.whiteSpace, wordBreak);
    return measureAnalysis(analysis, font, includeSegments, wordBreak, letterSpacing);`;
const OVERFLOW_WRAP_JS_PREPARE_REPLACEMENT = `function prepareInternal(text, font, includeSegments, options) {
    const wordBreak = options?.wordBreak ?? 'normal';
    const letterSpacing = options?.letterSpacing ?? 0;
    // vendored: upstream has no such option (always \`overflow-wrap:
    // break-word\`) — see VENDOR.json. \`'normal'\` is the real CSS default.
    const overflowWrap = options?.overflowWrap ?? 'normal';
    const analysis = analyzeText(text, getEngineProfile(), options?.whiteSpace, wordBreak);
    return measureAnalysis(analysis, font, includeSegments, wordBreak, letterSpacing, overflowWrap);`;

const OVERFLOW_WRAP_DTS_ANCHOR = `export type PrepareOptions = {
    whiteSpace?: WhiteSpaceMode;
    wordBreak?: WordBreakMode;
    letterSpacing?: number;
};`;
const OVERFLOW_WRAP_DTS_REPLACEMENT = `export type OverflowWrapMode = 'normal' | 'break-word' | 'anywhere';
export type PrepareOptions = {
    whiteSpace?: WhiteSpaceMode;
    wordBreak?: WordBreakMode;
    letterSpacing?: number;
    /** CSS \`overflow-wrap\`. Default \`'normal'\` — an atomic word wider than
     *  the line overflows instead of being sliced at grapheme boundaries.
     *  \`'break-word'\` / \`'anywhere'\` restore upstream's unconditional
     *  long-word grapheme fallback. */
    overflowWrap?: OverflowWrapMode;
};`;

const OVERFLOW_WRAP_RICH_JS_ANCHOR =
  '        const prepared = prepareWithSegments(trimmedText, item.font, letterSpacing === 0 ? undefined : { letterSpacing });';
const OVERFLOW_WRAP_RICH_JS_REPLACEMENT = `        // vendored: forward overflowWrap (upstream rich-inline.js never read
        // it — see VENDOR.json) so a per-item \`overflow-wrap: normal\` reaches
        // the same word-break fallback gate as the plain prepare() path.
        const prepareOptions = letterSpacing === 0 && item.overflowWrap === undefined
            ? undefined
            : { letterSpacing, overflowWrap: item.overflowWrap };
        const prepared = prepareWithSegments(trimmedText, item.font, prepareOptions);`;

const OVERFLOW_WRAP_RICH_DTS_ANCHOR = `import { type LayoutCursor } from './layout.js';
declare const preparedRichInlineBrand: unique symbol;
export type RichInlineItem = {
    text: string;
    font: string;
    letterSpacing?: number;
    break?: 'normal' | 'never';
    extraWidth?: number;
};`;
const OVERFLOW_WRAP_RICH_DTS_REPLACEMENT = `import { type LayoutCursor, type OverflowWrapMode } from './layout.js';
declare const preparedRichInlineBrand: unique symbol;
export type RichInlineItem = {
    text: string;
    font: string;
    letterSpacing?: number;
    break?: 'normal' | 'never';
    extraWidth?: number;
    /** CSS \`overflow-wrap\` for this item's own text. Default \`'normal'\`. */
    overflowWrap?: OverflowWrapMode;
};`;

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
        `  Upstream changed the measurement seam — re-read it and update the anchor.\n` +
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

  // MIT — keep the licence next to the code it covers.
  await writeFile(join(OUT, 'LICENSE'), await readFile(join(PKG, 'LICENSE')));
  files.push('LICENSE');

  // ── the one rewrite ──────────────────────────────────────────────────
  const jsPath = join(OUT, 'measurement.js');
  let js = await readFile(jsPath, 'utf8');
  js = replaceOnce(js, JS_ANCHOR, JS_REPLACEMENT, 'measurement.js');
  js = replaceOnce(js, DEAD_STATE_ANCHOR, '', 'measurement.js (dead state)');
  await writeFile(jsPath, SEAM_IMPORT + js);

  const dtsPath = join(OUT, 'measurement.d.ts');
  const dts = replaceOnce(
    await readFile(dtsPath, 'utf8'),
    DTS_ANCHOR,
    DTS_REPLACEMENT,
    'measurement.d.ts',
  );
  await writeFile(dtsPath, dts);

  // ── the second rewrite: overflow-wrap: normal ─────────────────────────
  const layoutJsPath = join(OUT, 'layout.js');
  let layoutJs = await readFile(layoutJsPath, 'utf8');
  layoutJs = replaceOnce(layoutJs, OVERFLOW_WRAP_JS_SIGNATURE_ANCHOR, OVERFLOW_WRAP_JS_SIGNATURE_REPLACEMENT, 'layout.js (measureAnalysis signature)');
  layoutJs = replaceOnce(layoutJs, OVERFLOW_WRAP_JS_CALLSITE_ANCHOR, OVERFLOW_WRAP_JS_CALLSITE_REPLACEMENT, 'layout.js (allowOverflowBreaks call site)');
  layoutJs = replaceOnce(layoutJs, OVERFLOW_WRAP_JS_PREPARE_ANCHOR, OVERFLOW_WRAP_JS_PREPARE_REPLACEMENT, 'layout.js (prepareInternal)');
  await writeFile(layoutJsPath, layoutJs);

  const layoutDtsPath = join(OUT, 'layout.d.ts');
  const layoutDts = replaceOnce(
    await readFile(layoutDtsPath, 'utf8'),
    OVERFLOW_WRAP_DTS_ANCHOR,
    OVERFLOW_WRAP_DTS_REPLACEMENT,
    'layout.d.ts (PrepareOptions)',
  );
  await writeFile(layoutDtsPath, layoutDts);

  const richInlineJsPath = join(OUT, 'rich-inline.js');
  const richInlineJs = replaceOnce(
    await readFile(richInlineJsPath, 'utf8'),
    OVERFLOW_WRAP_RICH_JS_ANCHOR,
    OVERFLOW_WRAP_RICH_JS_REPLACEMENT,
    'rich-inline.js (prepareWithSegments call)',
  );
  await writeFile(richInlineJsPath, richInlineJs);

  const richInlineDtsPath = join(OUT, 'rich-inline.d.ts');
  const richInlineDts = replaceOnce(
    await readFile(richInlineDtsPath, 'utf8'),
    OVERFLOW_WRAP_RICH_DTS_ANCHOR,
    OVERFLOW_WRAP_RICH_DTS_REPLACEMENT,
    'rich-inline.d.ts (RichInlineItem)',
  );
  await writeFile(richInlineDtsPath, richInlineDts);

  // ── provenance stamp ─────────────────────────────────────────────────
  const hashes: Record<string, string> = {};
  for (const rel of files.sort()) {
    const bytes = await readFile(join(OUT, rel));
    hashes[rel] = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
  }

  await writeFile(
    join(OUT, 'VENDOR.json'),
    JSON.stringify(
      {
        note: 'Generated by scripts/vendor-pretext.ts — do not edit by hand.',
        upstream: `${manifest.name}@${manifest.version}`,
        generatedFrom: 'dist/',
        patched: {
          'measurement.js': 'getMeasureContext() delegates to ../../measure/FontkitMeasureContext.ts',
          'measurement.d.ts': 'getMeasureContext() return type widened to the structural shape',
          'layout.js': "adds an `overflowWrap` option (default 'normal', the real CSS default) gating the word-break grapheme fallback — upstream hardcodes 'overflow-wrap: break-word' unconditionally",
          'layout.d.ts': 'PrepareOptions gets overflowWrap?: OverflowWrapMode',
          'rich-inline.js': 'forwards RichInlineItem.overflowWrap into prepareWithSegments()',
          'rich-inline.d.ts': 'RichInlineItem gets overflowWrap?: OverflowWrapMode',
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
