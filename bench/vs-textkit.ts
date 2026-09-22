/**
 * vs-textkit.ts — vyaz vs. react-pdf's @react-pdf/textkit
 * (https://www.npmjs.com/package/@react-pdf/textkit) on the same job: a rich
 * text document (styled paragraphs, bold/italic runs) → shaped, line-broken,
 * positioned lines.
 *
 *   bun run bench/vs-textkit.ts
 *   BENCH_MAX=5000 bun run bench/vs-textkit.ts     # cap the largest size
 *   BENCH_SIZES=50,500,2000 bun run bench/vs-textkit.ts
 *
 * Both engines are given the *same* word/style stream (see `paragraphsFor()`,
 * shared with vs-satori.ts's generator) and the *same* font (PT Sans, static
 * Regular/Bold/Italic — no variable-font axes, since textkit shapes glyphs
 * via plain fontkit `Font.layout()`, which doesn't resolve `fvar` axes).
 *
 * ── What's actually being compared ──────────────────────────────────────
 * textkit has no HTML/DOM input and no SVG/paint output — it's a layout
 * *engine*, not a document pipeline: you hand it an `AttributedString` (rich
 * text + font/size/etc. per run) and a container rect, and it internally
 * shapes every run's glyphs (via `font[0].layout()`, i.e. fontkit — see
 * `generateGlyphs()` in its source), runs Knuth-Plass line breaking, bidi,
 * script itemization, and justification, and hands back positioned lines
 * (`Paragraph[]` = `AttributedString[][]`, glyphs + advances per run).
 *
 * That is exactly the job vyaz's `layoutTextFrame()` does for a `TextFrame`.
 * So rather than route vyaz through `htmlToTextFrame()` (as vs-satori.ts
 * does, since Satori's input *is* a DOM-shaped tree), both engines here are
 * fed their native, pre-built rich-text structure directly — a `TextFrame`
 * for vyaz, one `Fragment[]` per paragraph (turned into an `AttributedString`
 * via textkit's own `fromFragments()`) for textkit — and only the
 * shape+line-break+justify stage is timed. Neither engine's render/paint
 * stage is included: vyaz's `renderToSVG()` has no textkit counterpart
 * (textkit's output feeds a PDF content-stream writer in react-pdf, not a
 * markup serializer), so comparing *that* stage would compare unrelated
 * work.
 *
 * `min` of N iterations is reported (capacity, not average), same
 * convention as `throughput.ts` / `vs-satori.ts`.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { create as fontkitCreate } from 'fontkit';
import textkitLayout, {
  bidi,
  linebreaker,
  justification,
  fontSubstitution,
  scriptItemizer,
  textDecoration,
  fromFragments,
  type Fragment,
  type Container,
} from '@react-pdf/textkit';

import { fontMetricsProvider } from '../packages/core/src/measure/FontMetricsProvider.js';
import { layoutTextFrame } from '../packages/core/src/layout/TextFrameLayoutEngine.js';
import type { TextFrame, Paragraph, TextRun } from '../packages/core/src/types/Document.js';

// ── shared font: static PT Sans (OFL), same fixture as vs-satori.ts ───────
const FIXTURES = resolve(import.meta.dir, 'fixtures');
const FONT_FAMILY = 'PT Sans';
const fontFile = (name: string) => readFileSync(resolve(FIXTURES, name));

const REGULAR = fontFile('PT_Sans-Web-Regular.ttf');
const BOLD = fontFile('PT_Sans-Web-Bold.ttf');
const ITALIC = fontFile('PT_Sans-Web-Italic.ttf');
const BOLD_ITALIC = fontFile('PT_Sans-Web-BoldItalic.ttf');

await fontMetricsProvider.registerFont(FONT_FAMILY, { weight: 'normal', style: 'normal' }, REGULAR);
await fontMetricsProvider.registerFont(FONT_FAMILY, { weight: 'bold', style: 'normal' }, BOLD);
await fontMetricsProvider.registerFont(FONT_FAMILY, { weight: 'normal', style: 'italic' }, ITALIC);
await fontMetricsProvider.registerFont(FONT_FAMILY, { weight: 'bold', style: 'italic' }, BOLD_ITALIC);

// textkit shapes via plain fontkit Font objects (only `.layout()` and
// `.unitsPerEm` are required — no @react-pdf/font wrapper needed).
const tkRegular = fontkitCreate(REGULAR);
const tkBold = fontkitCreate(BOLD);
const tkItalic = fontkitCreate(ITALIC);

// ── shared word/style generator (same scheme as vs-satori.ts) ─────────────
const WIDTH = 800;
const FONT_SIZE = 16;
const WORDS_PER_PARA = 40;
const WORDS = 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore'.split(' ');

type Token = { style: 'plain' | 'b' | 'i'; text: string };

function paragraphTokens(words: string[], startIdx: number): Token[] {
  const tokens: Token[] = [];
  let buf: string[] = [];
  const flush = () => { if (buf.length) { tokens.push({ style: 'plain', text: buf.join(' ') }); buf = []; } };
  words.forEach((w, i) => {
    const g = startIdx + i;
    if (g % 6 === 0) { flush(); tokens.push({ style: 'b', text: w }); }
    else if (g % 9 === 0) { flush(); tokens.push({ style: 'i', text: w }); }
    else buf.push(w);
  });
  flush();
  return tokens;
}

function paragraphsFor(totalWords: number): Token[][] {
  const paras: Token[][] = [];
  let made = 0;
  while (made < totalWords) {
    const count = Math.min(WORDS_PER_PARA, totalWords - made);
    const words = Array.from({ length: count }, (_, i) => WORDS[(made + i) % WORDS.length]);
    paras.push(paragraphTokens(words, made));
    made += count;
  }
  return paras;
}

/** vyaz's native input: a TextFrame built directly (no HTML round-trip). */
function buildFrame(paragraphs: Token[][]): TextFrame {
  const paras: Paragraph[] = paragraphs.map((tokens) => {
    const children: TextRun[] = tokens.map((t) => ({
      type: 'text',
      text: `${t.text} `,
      fontFamily: FONT_FAMILY,
      fontSize: FONT_SIZE,
      fontWeight: t.style === 'b' ? 'bold' : 'normal',
      fontStyle: t.style === 'i' ? 'italic' : 'normal',
      color: '#111',
    }));
    return {
      style: { alignment: 'left', lineHeight: 1.3, spaceBefore: 0, spaceAfter: 12, whiteSpace: 'normal' },
      children,
    };
  });
  return { width: WIDTH, wrap: true, paragraphs: paras };
}

/** textkit's native input: one Fragment[] per paragraph (→ fromFragments). */
function buildFragments(paragraphs: Token[][]): Fragment[][] {
  const fontFor = (style: Token['style']) => (style === 'b' ? [tkBold] : style === 'i' ? [tkItalic] : [tkRegular]);
  return paragraphs.map((tokens) =>
    tokens.map((t) => ({ string: `${t.text} `, attributes: { font: fontFor(t.style), fontSize: FONT_SIZE } })),
  );
}

// ── pipelines ───────────────────────────────────────────────────────────
function vyazLayout(frame: TextFrame): number {
  return layoutTextFrame(frame).lines.length;
}

const engines = { bidi, linebreaker, justification, fontSubstitution, scriptItemizer, textDecoration };
const textkitLayoutFn = textkitLayout(engines);
// No intrinsic content height either (matches Satori's fixed-height need) —
// textkit's Container.height bounds line breaking, so a generous fixed
// bound is required to lay out *all* content rather than truncate it.
const CONTAINER_HEIGHT = 400_000;

function textkitLayoutAll(paragraphFragments: Fragment[][]): number {
  let lines = 0;
  for (const fragments of paragraphFragments) {
    const attributedString = fromFragments(fragments);
    const container: Container = { x: 0, y: 0, width: WIDTH, height: CONTAINER_HEIGHT };
    const paragraphs = textkitLayoutFn(attributedString, container, {});
    for (const p of paragraphs) lines += p.length;
  }
  return lines;
}

// ── timing helpers (same convention as throughput.ts / vs-satori.ts) ──────
const gc = () => { try { (globalThis as any).Bun?.gc?.(true); } catch {} };

function bench(iters: number, fn: () => number): { min: number; median: number; result: number } {
  const result = fn(); // warm
  const t: number[] = [];
  for (let i = 0; i < iters; i++) {
    gc();
    const a = performance.now();
    fn();
    t.push(performance.now() - a);
  }
  t.sort((x, y) => x - y);
  return { min: t[0], median: t[(t.length / 2) | 0], result };
}

function itersFor(n: number): number {
  if (n <= 100) return 20;
  if (n <= 1_000) return 10;
  if (n <= 5_000) return 5;
  return 3;
}

// ── run ─────────────────────────────────────────────────────────────────
const DEFAULT_SIZES = [50, 500, 2_000, 10_000];
const cap = process.env.BENCH_MAX ? Number(process.env.BENCH_MAX) : Infinity;
const sizes = (process.env.BENCH_SIZES
  ? process.env.BENCH_SIZES.split(',').map(Number)
  : DEFAULT_SIZES
).filter((n) => n <= cap);

const fmt = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms.toFixed(2)}ms`);

console.log(`\nvyaz vs. @react-pdf/textkit — rich-text layout throughput   (PT Sans, ${WORDS_PER_PARA} words/paragraph, width ${WIDTH})\n`);

const rows: string[][] = [];

for (const n of sizes) {
  const paragraphs = paragraphsFor(n);
  const frame = buildFrame(paragraphs);
  const paragraphFragments = buildFragments(paragraphs);
  const iters = itersFor(n);

  const vyazTiming = bench(iters, () => vyazLayout(frame));
  const textkitTiming = bench(iters, () => textkitLayoutAll(paragraphFragments));

  const speedup = textkitTiming.min / vyazTiming.min;

  rows.push([
    n.toLocaleString(),
    fmt(vyazTiming.min),
    String(vyazTiming.result),
    fmt(textkitTiming.min),
    String(textkitTiming.result),
    `${speedup.toFixed(1)}×`,
  ]);

  console.log(
    `  ${n.toLocaleString().padStart(7)} words  ·  vyaz ${fmt(vyazTiming.min).padStart(8)} (${vyazTiming.result} lines)` +
      `  ·  textkit ${fmt(textkitTiming.min).padStart(8)} (${textkitTiming.result} lines)` +
      `  ·  ${speedup.toFixed(1)}× vyaz`,
  );
}

const head = ['words', 'vyaz layout (min)', 'vyaz lines', 'textkit layout (min)', 'textkit lines', 'time ratio'];
const widths = head.map((h, c) => Math.max(h.length, ...rows.map((r) => r[c].length)));
const line = (r: string[]) => '  ' + r.map((c, i) => c.padEnd(widths[i])).join('  │  ');
console.log('\n' + line(head));
console.log('  ' + widths.map((w) => '─'.repeat(w)).join('──┼──'));
for (const r of rows) console.log(line(r));
console.log(
  '\n(time ratio = textkit / vyaz — "×N vyaz" means vyaz is N× faster at the shape+line-break+justify stage)\n' +
    'Line counts will differ: vyaz and textkit use different line-breaking algorithms (greedy vs. Knuth-Plass)\n' +
    'and different paragraph spacing models, so the two are not expected to wrap identically — the counts are\n' +
    'a content sanity check, not a correctness comparison.\n',
);
