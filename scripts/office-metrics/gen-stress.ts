/**
 * gen-stress.ts — a big PowerPoint stress deck: find the font / size / string that still
 * makes a box sized by vyaz's office-mode width wrap in PowerPoint.
 *
 * 30 size/style configs (8 × 6 grid, 48 cells = 12 fonts × 4 strings each) are grouped
 * onto as few slides as fit (greedy by height). Every cell is ONE box whose width is exactly
 * vyaz's office `textBox.width`. vyaz expects ONE line everywhere: ANY box that wraps its
 * second line below the frame is a case where PowerPoint is wider than vyaz — a bug to report
 * (cell id in the label / objectName, details in stress.json).
 *
 * Frame colour = risk:
 *   green  vyaz applies NO kerning (small size, or GPOS-only font: Roboto / Inter)
 *   blue   vyaz applies kerning (≥ 12pt, kern-table font), kerning removes < 3pt
 *   orange vyaz applies kerning that removes ≥ 3pt   (widest exposure to a kerning mismatch)
 *
 * Strings: business sentences, kern-heavy pairs, XML-sensitive chars (<, >, &).
 *
 *   bun scripts/office-metrics/gen-stress.ts   → stress.pptx + stress.json
 */
import pptxgen from 'pptxgenjs';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fontMetricsProvider, layoutTextFrame } from '../../packages/core/src/index.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const PT2IN = (pt: number) => pt / 72;
const round2 = (n: number) => Math.round(n * 100) / 100;
const SUP = '/System/Library/Fonts/Supplemental/';
const WORD = '/Applications/Microsoft Word.app/Contents/Resources/DFonts/';
const HOME = process.env.HOME ?? '';

interface Face { regular: string; bold?: string; italic?: string; boldItalic?: string }
const FONTS: Record<string, Face> = {
  Roboto: { regular: `${HOME}/Library/Fonts/Roboto-Regular.ttf` },
  Inter: { regular: `${HOME}/Library/Fonts/Inter-Variable.ttf` },
  Arial: { regular: `${SUP}Arial.ttf`, bold: `${SUP}Arial Bold.ttf`, italic: `${SUP}Arial Italic.ttf`, boldItalic: `${SUP}Arial Bold Italic.ttf` },
  'Arial Narrow': { regular: `${SUP}Arial Narrow.ttf`, bold: `${SUP}Arial Narrow Bold.ttf`, italic: `${SUP}Arial Narrow Italic.ttf`, boldItalic: `${SUP}Arial Narrow Bold Italic.ttf` },
  'Times New Roman': { regular: `${SUP}Times New Roman.ttf`, bold: `${SUP}Times New Roman Bold.ttf`, italic: `${SUP}Times New Roman Italic.ttf`, boldItalic: `${SUP}Times New Roman Bold Italic.ttf` },
  Georgia: { regular: `${SUP}Georgia.ttf`, bold: `${SUP}Georgia Bold.ttf`, italic: `${SUP}Georgia Italic.ttf`, boldItalic: `${SUP}Georgia Bold Italic.ttf` },
  Calibri: { regular: `${WORD}Calibri.ttf`, bold: `${WORD}Calibrib.ttf`, italic: `${WORD}Calibrii.ttf`, boldItalic: `${WORD}Calibriz.ttf` },
  Verdana: { regular: `${SUP}Verdana.ttf`, bold: `${SUP}Verdana Bold.ttf`, italic: `${SUP}Verdana Italic.ttf`, boldItalic: `${SUP}Verdana Bold Italic.ttf` },
  Tahoma: { regular: `${SUP}Tahoma.ttf`, bold: `${SUP}Tahoma Bold.ttf` },
  'Trebuchet MS': { regular: `${SUP}Trebuchet MS.ttf`, bold: `${SUP}Trebuchet MS Bold.ttf`, italic: `${SUP}Trebuchet MS Italic.ttf`, boldItalic: `${SUP}Trebuchet MS Bold Italic.ttf` },
  'Comic Sans MS': { regular: `${SUP}Comic Sans MS.ttf`, bold: `${SUP}Comic Sans MS Bold.ttf` },
  'Courier New': { regular: `${SUP}Courier New.ttf`, bold: `${SUP}Courier New Bold.ttf`, italic: `${SUP}Courier New Italic.ttf`, boldItalic: `${SUP}Courier New Bold Italic.ttf` },
};
type Style = 'regular' | 'bold' | 'italic' | 'boldItalic';
const STYLE_OPTS: Record<Style, { weight: string; style: string }> = {
  regular: { weight: 'normal', style: 'normal' },
  bold: { weight: 'bold', style: 'normal' },
  italic: { weight: 'normal', style: 'italic' },
  boldItalic: { weight: 'bold', style: 'italic' },
};

// [size, style] — 30 slides
const SLIDES: [number, Style][] = [
  ...[8, 9, 9.19, 10, 10.5, 11, 12, 13.5, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72, 96, 120].map((s): [number, Style] => [s, 'regular']),
  ...[9, 12, 18, 36, 72].map((s): [number, Style] => [s, 'bold']),
  [11, 'italic'], [18, 'italic'], [48, 'italic'], [14, 'boldItalic'],
];

// 4 strings per size band, each band kept narrow enough for its size.
// Each band has one XML-sensitive string (<, >, &) to stress the PPTX generator.
const TEXTS = {
  small: ['Targets are agreed in advance.', 'Two Yellow Pears Fly Away.', 'Revenue < Budget & Costs > Plan', 'Sixty-Five (65%) of TVs, AV & Co.'],
  mid: ['Ta yo', 'AV yo Ty', 'Two Yellow Pears', 'AV > Ty & Ta'],
  large: ['Ta yo', 'AV yo', 'To Ta', '< AV >'],
} as const;
const textsFor = (size: number) => (size <= 20 ? TEXTS.small : size <= 54 ? TEXTS.mid : TEXTS.large);

// CJK (Simplified Chinese) fonts and strings — 3 size configs appended after Latin slides
const CJK_FONTS: Record<string, string> = {
  'SimHei': `${WORD}SimHei.ttf`,
  'Kaiti': `${WORD}Kaiti.ttf`,
  'Fangsong': `${WORD}Fangsong.ttf`,
  'SimSun Bold': `${WORD}simsunb.ttf`,
};
const CJK_TEXTS = {
  small: ['本季度营业收入', '年度绩效目标', '数字化转型战略', '收入 > 目标 & 利润'],
  mid: ['季度目标', '年度收入', '营业利润', '战略 > 目标'],
  large: ['季报', '收入', '利润', '> 目标'],
};
const CJK_SIZES = [12, 20, 36];
const cjkTextsFor = (size: number) => (size <= 16 ? CJK_TEXTS.small : size <= 28 ? CJK_TEXTS.mid : CJK_TEXTS.large);

const COLS = 8;
const ROWS = 6;
const CJK_COLS = 4; // one column per text string for CJK grids

// Russian (Cyrillic) slides — 3 dedicated output slides, one per size config
const RUSSIAN_SIZES = [11, 18, 32];
const RU_TEXTS = {
  small: ['Отчёт о доходах за квартал', 'Стратегические цели компании', 'Выручка < Бюджет & Расходы', 'Эффективность: +12.3% к плану'],
  mid: ['Квартальный доход', 'Расходы > цель', 'Выручка & план', 'Итого за год'],
  large: ['Отчёт', 'Доход', 'Расход', '> Цель'],
};
const ruTextsFor = (size: number) => (size <= 14 ? RU_TEXTS.small : size <= 28 ? RU_TEXTS.mid : RU_TEXTS.large);

function make(family: string, style: Style, text: string, size: number, width?: number, opts: object = {}) {
  const so = STYLE_OPTS[style];
  return layoutTextFrame(
    {
      width,
      wrap: true,
      paragraphs: [
        {
          style: { alignment: 'left', lineHeight: 1, spaceBefore: 0, spaceAfter: 0, whiteSpace: 'normal' },
          children: [{ type: 'text', text, fontFamily: family, fontSize: size, fontWeight: so.weight, fontStyle: so.style } as any],
        },
      ],
    },
    { mode: 'office', ...opts },
  );
}

async function main() {
  const usable: Record<Style, string[]> = { regular: [], bold: [], italic: [], boldItalic: [] };
  for (const [family, face] of Object.entries(FONTS)) {
    for (const st of Object.keys(STYLE_OPTS) as Style[]) {
      const path = face[st];
      if (!path || !existsSync(path)) continue;
      try {
        await fontMetricsProvider.registerFont(family, STYLE_OPTS[st] as any, readFileSync(path));
        usable[st].push(family);
      } catch (e) {
        console.log(`  skip ${family} ${st}: ${(e as Error).message.slice(0, 60)}`);
      }
    }
  }
  console.log('fonts per style:', Object.fromEntries(Object.entries(usable).map(([k, v]) => [k, v.length])));

  // ---- pass 1: measure every slide, then one common slide size (a pptx has a single size)
  const plans = SLIDES.map(([size, style], idx) => {
    const fonts = usable[style];
    const texts = textsFor(size);
    const cells = fonts.flatMap((family) => texts.map((text) => ({ family, text })));
    const measured = cells.map((c) => {
      const V = make(c.family, style, c.text, size).textBox.width;
      const noKern = make(c.family, style, c.text, size, undefined, { shaping: false, textBoxPadding: 0 }).textBox.width;
      const cur = make(c.family, style, c.text, size, undefined, { textBoxPadding: 0 }).textBox.width;
      const withKern = make(c.family, style, c.text, size, undefined, { shaping: true, textBoxPadding: 0 }).textBox.width;
      const W = round2(V);
      const lines = make(c.family, style, c.text, size, W).lines.length;
      return { ...c, W, lines, kernRemoved: round2(noKern - cur), kernFull: round2(noKern - withKern) };
    });
    const cellW = Math.max(110, Math.ceil(Math.max(...measured.map((m) => m.W)) + 26));
    const cellH = Math.ceil(13 + size * 1.2 * 2 + 10);
    return { slideNo: idx + 1, size, style, measured, cellW, cellH, planCols: COLS, needW: COLS * cellW, needH: 34 + ROWS * cellH };
  });

  // ---- CJK slides: register fonts, measure 3 size configs
  const cjkUsable: string[] = [];
  for (const [family, path] of Object.entries(CJK_FONTS)) {
    if (!existsSync(path)) continue;
    try {
      await fontMetricsProvider.registerFont(family, { weight: 'normal', style: 'normal' } as any, readFileSync(path));
      cjkUsable.push(family);
    } catch (e) {
      console.log(`  skip CJK ${family}: ${(e as Error).message.slice(0, 60)}`);
    }
  }
  console.log(`CJK fonts loaded: ${cjkUsable.length > 0 ? cjkUsable.join(', ') : 'none — CJK slides skipped'}`);

  const cjkPlans = cjkUsable.length > 0
    ? CJK_SIZES.map((size, i) => {
        const style: Style = 'regular';
        const texts = cjkTextsFor(size);
        const cells = cjkUsable.flatMap((family) => texts.map((text) => ({ family, text })));
        const measured = cells.map((c) => {
          const V = make(c.family, style, c.text, size).textBox.width;
          const noKern = make(c.family, style, c.text, size, undefined, { shaping: false, textBoxPadding: 0 }).textBox.width;
          const cur = make(c.family, style, c.text, size, undefined, { textBoxPadding: 0 }).textBox.width;
          const withKern = make(c.family, style, c.text, size, undefined, { shaping: true, textBoxPadding: 0 }).textBox.width;
          const W = round2(V);
          const lines = make(c.family, style, c.text, size, W).lines.length;
          return { ...c, W, lines, kernRemoved: round2(noKern - cur), kernFull: round2(noKern - withKern) };
        });
        const cellW = Math.max(80, Math.ceil(Math.max(...measured.map((m) => m.W)) + 26));
        const cellH = Math.ceil(13 + size * 1.2 * 2 + 10);
        const planRows = cjkUsable.length;
        return { slideNo: SLIDES.length + i + 1, size, style, measured, cellW, cellH, planCols: CJK_COLS, needW: CJK_COLS * cellW, needH: 34 + planRows * cellH };
      })
    : [];

  // ---- Russian slides: 3 dedicated output slides (forceNewSlide isolates each)
  const ruPlans = RUSSIAN_SIZES.map((size, i) => {
    const style: Style = 'regular';
    const texts = ruTextsFor(size);
    const fonts = usable[style]; // same 12 Latin fonts — all support Cyrillic
    const cells = fonts.flatMap((family) => texts.map((text) => ({ family, text })));
    const measured = cells.map((c) => {
      const V = make(c.family, style, c.text, size).textBox.width;
      const noKern = make(c.family, style, c.text, size, undefined, { shaping: false, textBoxPadding: 0 }).textBox.width;
      const cur = make(c.family, style, c.text, size, undefined, { textBoxPadding: 0 }).textBox.width;
      const withKern = make(c.family, style, c.text, size, undefined, { shaping: true, textBoxPadding: 0 }).textBox.width;
      const W = round2(V);
      const lines = make(c.family, style, c.text, size, W).lines.length;
      return { ...c, W, lines, kernRemoved: round2(noKern - cur), kernFull: round2(noKern - withKern) };
    });
    const cellW = Math.max(110, Math.ceil(Math.max(...measured.map((m) => m.W)) + 26));
    const cellH = Math.ceil(13 + size * 1.2 * 2 + 10);
    return { slideNo: SLIDES.length + CJK_SIZES.length + i + 1, size, style, measured, cellW, cellH, planCols: COLS, needW: COLS * cellW, needH: 34 + ROWS * cellH, forceNewSlide: true, tag: 'RU' };
  });

  const allPlans = [...plans, ...cjkPlans, ...ruPlans];
  const slideW = Math.max(...allPlans.map((p) => p.needW));
  const slideH = Math.max(...allPlans.map((p) => p.needH));
  if (slideW > 4032 || slideH > 4032) throw new Error(`common slide size ${slideW}x${slideH}pt is over PowerPoint's 56in (4032pt) limit`);
  console.log(`common slide size ${slideW} x ${slideH}pt (${round2(slideW / 72)} x ${round2(slideH / 72)} in)`);

  // ---- pass 2: group configs greedily by height, then build slides
  const MAIN_H = 34;    // main slide header height (pt)
  const SECTION_H = 20; // per-size section label height within a combined slide (pt)
  const globalCellW = Math.floor(slideW / COLS); // uniform column width for Latin sections

  type Plan = (typeof allPlans)[0];
  const groups: Plan[][] = [];
  {
    let cur: Plan[] = [];
    let usedH = MAIN_H;
    for (const p of allPlans) {
      const planRows = Math.ceil(p.measured.length / p.planCols);
      const need = SECTION_H + planRows * p.cellH;
      if (cur.length > 0 && (usedH + need > slideH || ('forceNewSlide' in p && p.forceNewSlide))) {
        groups.push(cur);
        cur = [];
        usedH = MAIN_H;
      }
      cur.push(p);
      usedH += need;
    }
    if (cur.length > 0) groups.push(cur);
  }
  console.log(`grouped ${allPlans.length} configs into ${groups.length} slides`);

  const expected: unknown[] = [];
  const prs = new pptxgen();
  prs.defineLayout({ name: 'STRESS', width: PT2IN(slideW), height: PT2IN(slideH) });
  prs.layout = 'STRESS';

  groups.forEach((group, gi) => {
    const slide = prs.addSlide();
    const outNo = gi + 1;
    const label = group.map((p) => `${'tag' in p && p.tag ? `[${p.tag}] ` : ''}${p.size}pt ${p.style}`).join(' · ');
    slide.addText(
      `STRESS ${outNo}/${groups.length} — ${label}. Every box = vyaz's office width EXACTLY (expect ONE line). A box that wraps = PowerPoint is wider = BUG: note its id. ` +
        `Frames: green = no kerning, blue = kerning (<3pt), orange = kerning (≥3pt). 12 fonts × 4 strings.`,
      { x: PT2IN(6), y: PT2IN(3), w: PT2IN(Math.min(slideW - 12, 2400)), h: PT2IN(MAIN_H - 6), fontFace: 'Arial', fontSize: 13, bold: true, color: '222222' },
    );
    let yOff = MAIN_H;
    for (const { slideNo, size, style, measured, cellH, cellW, planCols, tag } of group as any[]) {
      slide.addText(`${tag ? `[${tag}] ` : ''}${size}pt ${style}`, {
        x: PT2IN(6), y: PT2IN(yOff), w: PT2IN(Math.min(slideW - 12, 800)), h: PT2IN(SECTION_H - 2),
        fontFace: 'Arial', fontSize: 12, bold: true, color: '555555',
      });
      yOff += SECTION_H;
      const so = STYLE_OPTS[style];
      const sectionCellW = planCols === COLS ? globalCellW : cellW;
      measured.forEach((m, i) => {
        const col = i % planCols;
        const row = Math.floor(i / planCols);
        const x = col * sectionCellW + 6;
        const y = yOff + row * cellH;
        const id = `S${String(slideNo).padStart(2, '0')}_${row + 1}${col + 1}`;
        const color = m.kernRemoved <= 0.05 ? '00A050' : m.kernRemoved >= 3 ? 'FF8800' : '0070C0';
        slide.addText(`${id} · ${m.family}${style === 'regular' ? '' : ' ' + style} ${size} · W ${m.W} · k−${m.kernRemoved}`, {
          x: PT2IN(x), y: PT2IN(y), w: PT2IN(globalCellW - 8), h: PT2IN(12),
          fontFace: 'Arial', fontSize: Math.max(6, Math.min(14, size / 5 + 5)), color: '444444', margin: 0,
        });
        slide.addText(m.text, {
          x: PT2IN(x), y: PT2IN(y + 13), w: PT2IN(m.W), h: PT2IN(size * 1.2),
          wrap: true, fit: 'none', valign: 'top', margin: 0, lineSpacingMultiple: 1,
          fontFace: m.family, fontSize: size, bold: so.weight === 'bold', italic: so.style === 'italic', color: '111111',
          objectName: `${id}_${m.family.replace(/ /g, '')}_${size}_W${m.W}`, line: { color, width: Math.max(1, Math.min(4, size / 24 + 0.75)) },
        } as pptxgen.TextPropsOptions);
        if (m.lines !== 1) console.log(`  !! ${id}: vyaz itself gives ${m.lines}L at its own width`);
        expected.push({ id, slide: slideNo, font: m.family, style, sizePt: size, text: m.text, widthPt: m.W, kernRemovedPt: m.kernRemoved, kernFullPt: m.kernFull, vyazLines: m.lines, expectedLines: 1 });
      });
      yOff += ROWS * cellH;
    }
    console.log(`slide ${String(outNo).padStart(2)}: [${label}]`);
  });
  const out = resolve(HERE, 'stress.pptx');
  await prs.writeFile({ fileName: out });
  writeFileSync(resolve(HERE, 'stress.json'), JSON.stringify({ unit: 'pt', cells: expected }, null, 2));
  console.log(`wrote ${out} + stress.json (${expected.length} cells)`);
}

await main();
