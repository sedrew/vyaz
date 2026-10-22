/**
 * text-features-cases.ts — one case list, two outputs: exact DrawingML for
 * `text-features.pptx` and the equivalent vyaz `TextFrame` for `mode: 'office'`.
 *
 * Covers what the office line-box decks never touched: justify inside a run,
 * list markers (`marL` / `indent` / `buChar` / `buAutoNum`), whitespace and
 * line indices, empty paragraphs and `<a:br/>`, underline geometry, breaks
 * after hyphens; the first-line baseline across fonts and sizes; center /
 * right alignment, `spc` tracking, `baseline` super / subscript, list levels
 * and auto-number schemes. Texts are synthetic (no customer data).
 *
 * Units: 1 vyaz unit == 1 pt; DrawingML lengths in EMU (12700 / pt), sizes in
 * 1/100 pt.
 */
import type { TextFrame } from '../../packages/core/src/index.ts';

export interface CaseRun {
  t: string; // '\v' = <a:br/>
  sz: number; // pt
  b?: boolean;
  u?: boolean;
  s?: boolean; // strike="sngStrike"
  font?: string;
  spc?: number; // pt, <a:rPr spc> (character spacing)
  base?: number; // %, <a:rPr baseline> (30 = superscript, -25 = subscript)
}
export interface CaseBullet {
  char?: string; // buChar
  autoNum?: 'arabicPeriod' | 'alphaLcPeriod' | 'romanUcPeriod';
  startAt?: number; // buAutoNum startAt
  font?: string; // buFont; absent → text font
  sizePct?: number; // buSzPct, absent → PowerPoint default (100%)
}
export interface CasePara {
  algn?: 'l' | 'just' | 'ctr' | 'r';
  marL?: number; // pt
  indent?: number; // pt (negative = hanging)
  lvl?: number; // <a:pPr lvl>, 0-based
  bullet?: CaseBullet;
  runs: CaseRun[];
  endSz?: number; // <a:endParaRPr sz> — the size of an empty paragraph
}
export interface Case {
  name: string;
  group: 'justify' | 'list' | 'space' | 'empty' | 'underline' | 'hyphen' | 'baseline' | 'align' | 'spacing' | 'script' | 'level';
  width: number; // pt, insets 0
  font: string;
  paras: CasePara[];
  note?: string;
}

const PARA =
  'The quick brown fox jumps over the lazy dog while a frame measures every ' +
  'line box and decides where each word wraps inside the given rectangle.';

const r = (t: string, sz = 16, extra: Partial<CaseRun> = {}): CaseRun => ({ t, sz, ...extra });
const p = (runs: CaseRun[], extra: Partial<CasePara> = {}): CasePara => ({ runs, ...extra });

const bulletItems = (sz: number, marL: number, indent: number, bullet: CaseBullet, texts: string[]) =>
  texts.map((t) => p([r(t, sz)], { marL, indent, bullet }));

const DOT: CaseBullet = { char: '•', font: 'Arial' };
const NUM: CaseBullet = { autoNum: 'arabicPeriod' };
const ALPHA: CaseBullet = { autoNum: 'alphaLcPeriod' };
const ROMAN: CaseBullet = { autoNum: 'romanUcPeriod' };

/** One paragraph per size, "Hxg <size>" — the first-line baseline of each font. */
const BASELINE_SIZES = [12, 16, 24, 48, 96, 144];
const baselineCase = (font: string): Case => ({
  name: `b-${font.toLowerCase().replace(/ /g, '-')}`, group: 'baseline', width: 700, font,
  paras: BASELINE_SIZES.map((s) => p([r(`Hxg ${s}`, s)])),
});

/** A list item at nesting level `lvl`: PowerPoint's default 36 pt step per level, 18 pt hanging. */
const levelItem = (lvl: number, t: string, bullet: CaseBullet, extra: Partial<CasePara> = {}): CasePara =>
  p([r(t)], { lvl, marL: 18 + 36 * lvl, indent: -18, bullet, ...extra });

const HYPHEN_TOKENS = [
  'state-of-the-art', 'well-known', 'e-mail', '2024-10-06', 'TEST-1234',
  '+1-800-555-0199', 'A-1', '10-20', 'x-ray', 'non‑breaking',
  'en–dash', 'em—dash', 'soft­hyphen', 'co-op-ed',
];

export const CASES: Case[] = [
  // ── justify ──────────────────────────────────────────────────────────
  { name: 'j-single', group: 'justify', width: 200, font: 'Arial', paras: [p([r(PARA)], { algn: 'just' })] },
  {
    name: 'j-multirun', group: 'justify', width: 200, font: 'Arial',
    paras: [p([r('The quick '), r('brown fox', 16, { b: true }), r(' jumps over the lazy dog while a frame measures every line box.')], { algn: 'just' })],
  },
  {
    name: 'j-mixed-size', group: 'justify', width: 220, font: 'Arial',
    paras: [p([r('Small words then '), r('BIG', 28), r(' and more small words that wrap onto further lines.')], { algn: 'just' })],
  },
  {
    name: 'j-br', group: 'justify', width: 200, font: 'Arial',
    paras: [p([r('Short line ends in a break\vthen the text continues long enough to wrap twice inside the box.')], { algn: 'just' })],
    note: 'is the line before <a:br/> stretched?',
  },
  { name: 'j-multispace', group: 'justify', width: 200, font: 'Arial', paras: [p([r('Two  spaces   three    four spaces between words that wrap here.')], { algn: 'just' })] },
  { name: 'j-roboto', group: 'justify', width: 200, font: 'Roboto', paras: [p([r(PARA, 18)], { algn: 'just' })] },
  { name: 'j-underline', group: 'justify', width: 200, font: 'Arial', paras: [p([r(PARA, 16, { u: true })], { algn: 'just' })] },

  // ── lists ────────────────────────────────────────────────────────────
  { name: 'l-bullet-27', group: 'list', width: 260, font: 'Arial', paras: bulletItems(16, 27, -27, DOT, ['First item', 'Second item that is long enough to wrap onto a second line', 'Third']) },
  { name: 'l-bullet-18', group: 'list', width: 260, font: 'Arial', paras: bulletItems(16, 18, -18, DOT, ['First item', 'Second item that is long enough to wrap onto a second line']) },
  { name: 'l-bullet-6', group: 'list', width: 260, font: 'Arial', paras: bulletItems(16, 6, -6, DOT, ['Hanging narrower than the bullet', 'Second']), note: 'bullet wider than the hanging indent' },
  { name: 'l-bullet-0', group: 'list', width: 260, font: 'Arial', paras: bulletItems(16, 0, 0, DOT, ['No hanging indent at all', 'Second']) },
  { name: 'l-bullet-indent40', group: 'list', width: 260, font: 'Arial', paras: bulletItems(16, 40, -20, DOT, ['marL 40 indent -20', 'Second item long enough to wrap onto a second line']) },
  { name: 'l-bullet-sizes', group: 'list', width: 300, font: 'Arial', paras: [12, 24, 40].map((s) => p([r(`Size ${s}`, s)], { marL: 36, indent: -36, bullet: DOT })) },
  { name: 'l-bullet-pct', group: 'list', width: 300, font: 'Arial', paras: [50, 90, 150].map((pct) => p([r(`buSzPct ${pct}`, 24)], { marL: 36, indent: -36, bullet: { ...DOT, sizePct: pct } })) },
  { name: 'l-bullet-textfont', group: 'list', width: 300, font: 'Roboto', paras: bulletItems(20, 27, -27, { char: '•' }, ['Roboto, bullet inherits the text font', 'Second']) },
  { name: 'l-number-27', group: 'list', width: 260, font: 'Arial', paras: bulletItems(16, 27, -27, NUM, Array.from({ length: 11 }, (_, i) => `Item ${i + 1}`)) },
  { name: 'l-number-12', group: 'list', width: 260, font: 'Arial', paras: bulletItems(16, 12, -12, NUM, Array.from({ length: 11 }, (_, i) => `Item ${i + 1}`)), note: 'two-digit number wider than the hanging indent' },

  // ── whitespace / indices ─────────────────────────────────────────────
  { name: 's-multispace', group: 'space', width: 80, font: 'Arial', paras: [p([r('aaa    bbb   ccc dddddd eeeee  fffff')])] },
  { name: 's-lead-trail', group: 'space', width: 200, font: 'Arial', paras: [p([r('    four leading')]), p([r('four trailing    ')]), p([r('x')])] },
  { name: 's-runs', group: 'space', width: 300, font: 'Arial', paras: [p([r('aaa   '), r('  bbb ccc', 16, { b: true })])] },
  { name: 's-wrap-spaces', group: 'space', width: 100, font: 'Arial', paras: [p([r('word          next word after many spaces')])] },

  // ── empty paragraphs / breaks ────────────────────────────────────────
  { name: 'e-empty-40', group: 'empty', width: 200, font: 'Arial', paras: [p([r('A', 40)]), p([], { endSz: 40 }), p([r('B', 40)])] },
  { name: 'e-empty-12', group: 'empty', width: 200, font: 'Arial', paras: [p([r('A', 40)]), p([], { endSz: 12 }), p([r('B', 40)])] },
  { name: 'e-empty-run', group: 'empty', width: 200, font: 'Arial', paras: [p([r('A', 40)]), p([r('', 40)], { endSz: 40 }), p([r('B', 40)])], note: 'an <a:r> with empty <a:t>' },
  { name: 'e-br-br', group: 'empty', width: 200, font: 'Arial', paras: [p([r('a\v\vb', 40)])] },
  { name: 'e-br-end', group: 'empty', width: 200, font: 'Arial', paras: [p([r('a\v', 40)]), p([r('b', 40)])] },

  // ── underline ────────────────────────────────────────────────────────
  { name: 'u-sizes-arial', group: 'underline', width: 600, font: 'Arial', paras: [8, 10, 12, 16, 20, 24, 32, 48, 72].map((s) => p([r(`Hxg ${s}pt`, s, { u: true })])) },
  { name: 'u-sizes-roboto', group: 'underline', width: 600, font: 'Roboto', paras: [8, 10, 12, 16, 20, 24, 32, 48, 72].map((s) => p([r(`Hxg ${s}pt`, s, { u: true })])) },
  { name: 'u-big-arial', group: 'underline', width: 700, font: 'Arial', paras: [96, 144].map((s) => p([r(`Hxg ${s}`, s, { u: true })])), note: 'PDF snaps rules to whole pt; big sizes keep the fit honest' },
  { name: 'u-big-roboto', group: 'underline', width: 700, font: 'Roboto', paras: [96, 144].map((s) => p([r(`Hxg ${s}`, s, { u: true })])) },
  { name: 'u-mixed', group: 'underline', width: 400, font: 'Arial', paras: [p([r('small ', 16, { u: true }), r('BIG', 40, { u: true }), r(' small', 16, { u: true })])] },
  // which run sets the one rule PowerPoint draws per line? 10pt vs 100pt, order and width varied
  { name: 'u-mix-big-first', group: 'underline', width: 700, font: 'Arial', paras: [p([r('B', 100, { u: true }), r(' small text', 10, { u: true })])] },
  { name: 'u-mix-small-first', group: 'underline', width: 700, font: 'Arial', paras: [p([r('small text ', 10, { u: true }), r('B', 100, { u: true })])] },
  { name: 'u-mix-small-wide', group: 'underline', width: 700, font: 'Arial', paras: [p([r('B', 100, { u: true }), r(' small text that is much wider than the big letter in front of it', 10, { u: true })])] },
  { name: 'u-mix-big-only', group: 'underline', width: 700, font: 'Arial', paras: [p([r('small ', 10), r('B', 100, { u: true }), r(' small', 10)])] },
  { name: 'u-mix-small-only', group: 'underline', width: 700, font: 'Arial', paras: [p([r('small ', 10, { u: true }), r('B', 100), r(' small', 10, { u: true })])] },
  { name: 'k-sizes-arial', group: 'underline', width: 700, font: 'Arial', paras: [16, 48, 96, 144].map((sz) => p([r(`Hxg ${sz}`, sz, { s: true })])), note: 'strikethrough' },
  { name: 'k-sizes-roboto', group: 'underline', width: 700, font: 'Roboto', paras: [16, 48, 96, 144].map((sz) => p([r(`Hxg ${sz}`, sz, { s: true })])), note: 'strikethrough' },
  { name: 'k-mix', group: 'underline', width: 700, font: 'Arial', paras: [p([r('B', 100, { s: true }), r(' small text', 10, { s: true })])], note: 'strikethrough, mixed sizes' },
  { name: 'u-partial', group: 'underline', width: 400, font: 'Arial', paras: [p([r('plain '), r('under lined', 16, { u: true }), r(' plain')])] },
  { name: 'u-wrap-trailing', group: 'underline', width: 120, font: 'Arial', paras: [p([r('underlined words that wrap here', 16, { u: true })])] },

  // ── hyphen breaks — one box per token, ~60% of its width ─────────────
  ...HYPHEN_TOKENS.map((t, i): Case => ({ name: `h-${i}`, group: 'hyphen', width: 0, font: 'Arial', paras: [p([r(t, 20)])], note: JSON.stringify(t) })),
  { name: 'h-sentence', group: 'hyphen', width: 130, font: 'Arial', paras: [p([r('The well-known state-of-the-art e-mail system', 20)])] },

  // ── first-line baseline at spcPct 100 % — fonts whose typo / win ratios differ ──
  ...['Times New Roman', 'Georgia', 'Verdana', 'Courier New', 'Tahoma'].map(baselineCase),

  // ── center / right alignment ─────────────────────────────────────────
  { name: 'a-center', group: 'align', width: 200, font: 'Arial', paras: [p([r(PARA)], { algn: 'ctr' })] },
  { name: 'a-right', group: 'align', width: 200, font: 'Arial', paras: [p([r(PARA)], { algn: 'r' })] },
  {
    name: 'a-spaces', group: 'align', width: 200, font: 'Arial',
    paras: [p([r('centred    ')], { algn: 'ctr' }), p([r('    centred')], { algn: 'ctr' }), p([r('right    ')], { algn: 'r' }), p([r('    right')], { algn: 'r' })],
    note: 'do leading / trailing spaces count when centring / right-aligning?',
  },
  {
    name: 'a-right-mixed', group: 'align', width: 220, font: 'Arial',
    paras: [p([r('Small words then '), r('BIG', 28), r(' and more small words that wrap onto further lines.')], { algn: 'r' })],
  },
  { name: 'a-center-indent', group: 'align', width: 240, font: 'Arial', paras: [p([r(PARA)], { algn: 'ctr', marL: 40, indent: 20 })], note: 'marL 40, first-line indent +20' },

  // ── spc (character spacing) ──────────────────────────────────────────
  { name: 'sp-plus3', group: 'spacing', width: 300, font: 'Arial', paras: [p([r(PARA, 16, { spc: 3 })])] },
  { name: 'sp-minus1', group: 'spacing', width: 200, font: 'Arial', paras: [p([r(PARA, 16, { spc: -1 })])] },
  { name: 'sp-mixed', group: 'spacing', width: 400, font: 'Arial', paras: [p([r('normal '), r('spaced out', 16, { spc: 5 }), r(' normal')])] },
  { name: 'sp-justify', group: 'spacing', width: 200, font: 'Arial', paras: [p([r(PARA, 16, { spc: 2 })], { algn: 'just' })] },
  { name: 'sp-right', group: 'spacing', width: 200, font: 'Arial', paras: [p([r('Tracked right', 16, { spc: 4 })], { algn: 'r' })], note: 'is the spacing after the last letter part of the line?' },
  { name: 'sp-big', group: 'spacing', width: 600, font: 'Arial', paras: [p([r('Tracking', 48, { spc: 10 })])] },

  // ── baseline (super / subscript) ─────────────────────────────────────
  { name: 'x-super', group: 'script', width: 400, font: 'Arial', paras: [p([r('E = mc', 24), r('2', 24, { base: 30 }), r(' end', 24)])] },
  { name: 'x-sub', group: 'script', width: 400, font: 'Arial', paras: [p([r('H', 24), r('2', 24, { base: -25 }), r('O water', 24)])] },
  { name: 'x-big', group: 'script', width: 600, font: 'Arial', paras: [p([r('A', 72), r('B', 72, { base: 30 }), r('C', 72, { base: -25 }), r('D', 72)])] },
  { name: 'x-wrap', group: 'script', width: 160, font: 'Arial', paras: [p([r('First line text '), r('sup', 16, { base: 30 }), r(' then more words to wrap '), r('sub', 16, { base: -25 }), r(' and end.')])], note: 'does a script run grow its line box?' },

  // shift per baseline percentage at 96 pt (PDF baselines ±0.5 pt → < 0.6 %)
  ...[30, -25, 50, -50, 15, -10, 80].map((pct): Case => ({
    name: `x-pct${pct}`, group: 'script', width: 600, font: 'Arial',
    paras: [p([r('H', 96), r('2', 96, { base: pct }), r('H', 96)])],
  })),
  // script size: object-model width of "0000" (Arial digits 0.556 em) gives the size exactly
  ...[13, 17, 25, 40].map((sz): Case => ({
    name: `x-size${sz}`, group: 'script', width: 600, font: 'Arial',
    paras: [p([r('0000', sz), r('0000', sz, { base: 30 }), r('0000', sz, { base: -25 })])],
  })),

  // ── list levels and auto-number schemes ──────────────────────────────
  {
    name: 'lv-bullets', group: 'level', width: 300, font: 'Arial',
    paras: [levelItem(0, 'Level 0', DOT), levelItem(1, 'Level 1', { char: '–', font: 'Arial' }), levelItem(2, 'Level 2', { char: '▪', font: 'Arial' }), levelItem(1, 'Back to 1', { char: '–', font: 'Arial' }), levelItem(0, 'Back to 0', DOT)],
  },
  {
    name: 'lv-numbers', group: 'level', width: 300, font: 'Arial',
    paras: [levelItem(0, 'One', NUM), levelItem(1, 'Nested a', { autoNum: 'alphaLcPeriod' }), levelItem(1, 'Nested b', { autoNum: 'alphaLcPeriod' }), levelItem(0, 'Two after nesting', NUM), levelItem(0, 'Three', NUM)],
    note: 'does level 0 continue at 2 after the nested items?',
  },
  {
    name: 'lv-break', group: 'level', width: 300, font: 'Arial',
    paras: [levelItem(0, 'One', NUM), levelItem(0, 'Two', NUM), p([r('Plain paragraph')]), levelItem(0, 'After plain', NUM)],
    note: 'does a plain paragraph restart the numbering?',
  },
  {
    name: 'lv-schemes', group: 'level', width: 300, font: 'Arial',
    paras: [
      ...[0, 1, 2].map((k) => levelItem(0, `roman ${k + 4}`, { autoNum: 'romanUcPeriod', startAt: 4 })),
      ...[0, 1].map((k) => levelItem(0, `alpha ${k + 25}`, { autoNum: 'alphaLcPeriod', startAt: 25 })),
    ],
    note: 'romanUcPeriod from 4, alphaLcPeriod from 25 (y, z)',
  },
  {
    name: 'lv-nested-again', group: 'level', width: 300, font: 'Arial',
    paras: [levelItem(0, 'One', NUM), levelItem(1, 'a under one', ALPHA), levelItem(1, 'b under one', ALPHA), levelItem(0, 'Two', NUM), levelItem(1, 'under two', ALPHA), levelItem(2, 'deeper', ROMAN), levelItem(0, 'Three', NUM)],
    note: 'does level 1 start again at a. under the next level-0 item?',
  },
  {
    name: 'lv-bullet-same-level', group: 'level', width: 300, font: 'Arial',
    paras: [levelItem(0, 'One', NUM), levelItem(0, 'Two', NUM), levelItem(0, 'a bullet', DOT), levelItem(0, 'after the bullet', NUM)],
    note: 'a bullet at the same level between numbers',
  },
  {
    name: 'lv-bullet-nested', group: 'level', width: 300, font: 'Arial',
    paras: [levelItem(0, 'One', NUM), levelItem(1, 'nested bullet', DOT), levelItem(0, 'after nested bullet', NUM)],
  },
  {
    name: 'lv-startat', group: 'level', width: 300, font: 'Arial',
    paras: [levelItem(0, 'from 1', NUM), levelItem(0, 'from 1', NUM), levelItem(0, 'from 10', { ...NUM, startAt: 10 }), levelItem(0, 'from 10', { ...NUM, startAt: 10 }), levelItem(0, 'from 1 again', NUM)],
    note: 'startAt 1, 1, 10, 10, 1',
  },
  {
    name: 'lv-start-deep', group: 'level', width: 300, font: 'Arial',
    paras: [levelItem(1, 'starts at level 1', ALPHA), levelItem(1, 'second', ALPHA), levelItem(0, 'then level 0', NUM), levelItem(0, 'level 0 again', NUM)],
  },
  {
    name: 'lv-empty-between', group: 'level', width: 300, font: 'Arial',
    paras: [levelItem(0, 'One', NUM), p([], { lvl: 0, marL: 18, indent: -18, bullet: NUM, endSz: 16 }), levelItem(0, 'after an empty numbered paragraph', NUM)],
    note: 'an empty paragraph that carries the numbering',
  },
  { name: 'lv-center', group: 'level', width: 260, font: 'Arial', paras: bulletItems(16, 27, -27, DOT, ['Centred item', 'Second centred item that wraps onto a second line']).map((q) => ({ ...q, algn: 'ctr' as const })), note: 'where does the bullet go in a centred paragraph?' },
  { name: 'lv-right', group: 'level', width: 260, font: 'Arial', paras: bulletItems(16, 27, -27, NUM, ['Right item', 'Second']).map((q) => ({ ...q, algn: 'r' as const })) },
];

// ── DrawingML ──────────────────────────────────────────────────────────

const EMU = (pt: number) => Math.round(pt * 12700);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function rPr(run: CaseRun, font: string, tag = 'a:rPr'): string {
  const f = run.font ?? font;
  const attrs = `lang="en-US" sz="${Math.round(run.sz * 100)}"${run.b ? ' b="1"' : ' b="0"'}${run.u ? ' u="sng"' : ''}${run.s ? ' strike="sngStrike"' : ''}${run.spc ? ` spc="${Math.round(run.spc * 100)}"` : ''}${run.base ? ` baseline="${run.base * 1000}"` : ''} dirty="0"`;
  return `<${tag} ${attrs}><a:solidFill><a:srgbClr val="000000"/></a:solidFill><a:latin typeface="${f}"/><a:cs typeface="${f}"/></${tag}>`;
}

export function paraXml(para: CasePara, font: string): string {
  const pAttrs: string[] = [`algn="${para.algn ?? 'l'}"`];
  pAttrs.push(`marL="${EMU(para.marL ?? 0)}"`, `indent="${EMU(para.indent ?? 0)}"`);
  if (para.lvl) pAttrs.push(`lvl="${para.lvl}"`);
  let pPr = '<a:lnSpc><a:spcPct val="100000"/></a:lnSpc><a:spcBef><a:spcPts val="0"/></a:spcBef><a:spcAft><a:spcPts val="0"/></a:spcAft>';
  const b = para.bullet;
  if (b) {
    if (b.sizePct) pPr += `<a:buSzPct val="${b.sizePct * 1000}"/>`;
    if (b.font) pPr += `<a:buFont typeface="${b.font}"/>`;
    pPr += b.autoNum ? `<a:buAutoNum type="${b.autoNum}"${b.startAt ? ` startAt="${b.startAt}"` : ''}/>` : `<a:buChar char="${esc(b.char ?? '•')}"/>`;
  } else {
    pPr += '<a:buNone/>';
  }
  let body = '';
  for (const run of para.runs) {
    const parts = run.t.split('\v');
    parts.forEach((part, i) => {
      if (i > 0) body += `<a:br>${rPr(run, font)}</a:br>`;
      if (part.length > 0 || parts.length === 1) body += `<a:r>${rPr(run, font)}<a:t>${esc(part)}</a:t></a:r>`;
    });
  }
  const endSz = para.endSz ?? para.runs[para.runs.length - 1]?.sz ?? 18;
  return `<a:p><a:pPr ${pAttrs.join(' ')}>${pPr}</a:pPr>${body}${rPr({ t: '', sz: endSz }, font, 'a:endParaRPr')}</a:p>`;
}

// ── vyaz ───────────────────────────────────────────────────────────────

const NUMBER_FORMAT = { arabicPeriod: 'decimal', alphaLcPeriod: 'lower-alpha', romanUcPeriod: 'upper-roman' } as const;

/**
 * The `TextFrame` a caller would build for the same DrawingML. Lists map
 * `marL` / `indent` onto vyaz's marker zone: `leftIndent = marL + indent`
 * (where PowerPoint puts the bullet), `bulletIndent = -indent` (so text
 * starts at `marL`), `buSzPct` → `bulletSize`, `buFont` → `bulletFont`.
 * `lvl` → `listStyle.level` with `indents[level]` = the hanging indent (so
 * vyaz does not multiply it by the level), `buAutoNum` scheme → `numberFormat`,
 * `startAt` → `startNumber`. `spc` → `letterSpacing`, `baseline` > 0 / < 0 →
 * `script: 'super'` / `'sub'` (vyaz has no percentage). `<a:br/>` → `\n`. `whiteSpace` is left unset (`mode: 'office'` defaults
 * to PowerPoint's `pre-wrap`); `overflowWrap: 'break-word'` is set explicitly,
 * as a PPTX importer would — a text box is a real box, never a width probe.
 */
export function toTextFrame(c: Case, width: number): TextFrame {
  return {
    width,
    wrap: true,
    paragraphs: c.paras.map((q) => {
      const style: any = {
        alignment: ({ l: 'left', just: 'justify', ctr: 'center', r: 'right' } as const)[q.algn ?? 'l'],
        lineHeight: 1,
        spaceBefore: 0,
        spaceAfter: 0,
        overflowWrap: 'break-word',
      };
      if (q.bullet) {
        const hang = -(q.indent ?? 0);
        style.leftIndent = (q.marL ?? 0) - hang;
        const marker = {
          bulletIndent: hang,
          ...(q.lvl ? { level: q.lvl, indents: Object.assign([], { [q.lvl]: hang }) } : {}),
          ...(q.bullet.sizePct ? { bulletSize: q.bullet.sizePct / 100 } : {}),
          ...(q.bullet.font ? { bulletFont: q.bullet.font } : {}),
        };
        style.listStyle = q.bullet.autoNum
          ? { type: 'number', startNumber: q.bullet.startAt ?? 1, numberFormat: NUMBER_FORMAT[q.bullet.autoNum], ...marker }
          : { type: 'bullet', bulletChar: q.bullet.char ?? '•', ...marker };
      } else if (q.marL || q.indent) {
        style.leftIndent = q.marL ?? 0;
        style.indent = q.indent ?? 0;
      }
      return {
        style,
        // an empty paragraph: its <a:endParaRPr> size as one empty run
        children: (q.runs.length ? q.runs : [{ t: '', sz: q.endSz ?? 18 }]).map((x) => ({
          type: 'text',
          text: x.t.replace(/\v/g, '\n'),
          fontFamily: x.font ?? c.font,
          fontSize: x.sz,
          fontWeight: x.b ? 'bold' : 'normal',
          ...(x.u ? { underline: true } : {}),
          ...(x.s ? { strikethrough: true } : {}),
          ...(x.spc ? { letterSpacing: x.spc } : {}),
          ...(x.base ? { script: x.base > 0 ? 'super' : 'sub' } : {}),
        })),
      };
    }),
  } as TextFrame;
}

/** Paragraph text as PowerPoint numbers it (`\v` for `<a:br/>`). */
export const paraText = (q: CasePara) => q.runs.map((x) => x.t).join('');
