/**
 * text-features-run.ts — PowerPoint oracle for justify, list markers,
 * whitespace / line indices, empty paragraphs, underline geometry and hyphen
 * breaks, compared with vyaz `mode: 'office'` and its `glyph` SVG.
 *
 *   bun scripts/office-metrics/text-features-run.ts          # build deck, drive PowerPoint, compare
 *   bun scripts/office-metrics/text-features-run.ts --cached # re-compare against the frozen JSON
 *   … --svg-out <dir>                                        # also write each case's vyaz glyph SVG
 *
 * 1. Builds `text-features.pptx` from `text-features-cases.ts` — one case per
 *    slide, one TextBox at (36, 36) pt, insets 0, no autofit; pptxgenjs lays
 *    out the deck, the text bodies are replaced with exact DrawingML.
 * 2. Copies it into PowerPoint's sandbox container and runs
 *    `measure-text-features.applescript`: line and character bounds from the
 *    object model, then Save as PDF.
 * 3. Reads the PDF (`pdf-geometry.ts`) for baselines, bullet glyphs and
 *    underline rules (PowerPoint's PDF snaps rules and baselines to whole
 *    points of the slide), and `pdftotext -bbox` (poppler) for the text of
 *    list markers.
 * 4. Freezes PowerPoint's numbers in `text-features.json` (`ppt`) and writes
 *    `TEXT-FEATURES.md` with the vyaz comparison.
 *
 * Needs PowerPoint for Mac, the system fonts below, Roboto installed for
 * PowerPoint, and `pdftotext` (`brew install poppler`) for marker text.
 */
import pptxgen from 'pptxgenjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import * as fontkit from 'fontkit';

import { fontMetricsProvider, layoutTextFrame } from '../../packages/core/src/index.ts';
import type { Line } from '../../packages/core/src/index.ts';
import { renderResultToSVG } from '../../packages/renderers/src/index.ts';
import { CASES, paraXml, toTextFrame, paraText, type Case } from './text-features-cases.ts';
import { readPdfGeometry, type PdfPage } from './pdf-geometry.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = resolve(HERE, '../../packages/core/tests/fixtures');
const DECK = join(HERE, 'text-features.pptx');
const JSON_OUT = join(HERE, 'text-features.json');
const REPORT = join(HERE, 'TEXT-FEATURES.md');
const SANDBOX = join(homedir(), 'Library/Containers/com.microsoft.Powerpoint/Data/Documents/vyaz-text-features');
const BOX = { x: 36, y: 36, h: 540 - 72 };
const r2 = (n: number) => Math.round(n * 100) / 100;

const SUP = '/System/Library/Fonts/Supplemental';
const FONT_FILES: [string, string, string][] = [
  ['Arial', 'normal', `${SUP}/Arial.ttf`],
  ['Arial', 'bold', `${SUP}/Arial Bold.ttf`],
  ['Roboto', 'normal', resolve(FIX, 'Roboto-VariableFont_wdth,wght.ttf')],
  ...['Times New Roman', 'Georgia', 'Verdana', 'Courier New', 'Tahoma'].map((f): [string, string, string] => [f, 'normal', `${SUP}/${f}.ttf`]),
];

// ── vyaz side ──────────────────────────────────────────────────────────

interface VChar { ch: string; x: number; w: number }
interface VRun { x: number; size: number; shift: number; text: string }
interface VLine { text: string; y: number; height: number; baseline: number; startIndex: number; endIndex: number; pIdx: number | null; marker?: { x: number; width: number; size: number; text: string }; textX: number | null; runs: VRun[]; chars: VChar[] }

function vyazLines(c: Case, width: number) {
  const res = layoutTextFrame(toTextFrame(c, width), { mode: 'office', glyphAdvances: true, textBoxPadding: 0 } as any);
  const lines: VLine[] = res.lines.map((l: Line) => {
    const minX = l.spans.length ? Math.min(...l.spans.map((s) => s.x)) : 0;
    const abs = (sx: number) => l.x + (sx - minX);
    const chars: VChar[] = [];
    const runs: VRun[] = [];
    let marker: VLine['marker'];
    let textX: number | null = null;
    for (const s of l.spans) {
      if (s.type === 'marker') { marker = { x: r2(abs(s.x)), width: r2(s.width), size: s.fontMetrics.fontSize, text: s.text }; continue; }
      if (s.type === 'text' && textX === null) textX = r2(abs(s.x));
      if (s.type === 'text') runs.push({ x: r2(abs(s.x)), size: r2(s.fontMetrics.fontSize), shift: r2(s.fontMetrics.baselineOffset ?? 0), text: s.text });
      let x = abs(s.x);
      // glyphAdvances leave letterSpacing out; renderers add it after every glyph
      const ls = s.glyphAdvances ? s.style.letterSpacing ?? 0 : 0;
      for (let k = 0; k < s.text.length; k++) {
        const w = s.glyphAdvances ? s.glyphAdvances[k] + ls : s.width / s.text.length;
        chars.push({ ch: s.text[k], x: r2(x), w: r2(w) });
        x += w;
      }
    }
    return {
      text: l.spans.filter((s) => s.type !== 'marker').map((s) => s.text).join(''),
      y: r2(l.y), height: r2(l.height), baseline: r2(l.y + l.baseline),
      startIndex: l.startIndex, endIndex: l.endIndex,
      pIdx: l.pIdx ?? null,
      marker, textX, runs, chars,
    };
  });
  // glyph-preset SVG: explicit <line> decoration rules (underline / strike)
  const svg = renderResultToSVG(res, { preset: 'glyph', width, height: 1000 } as any);
  const rules = [...svg.matchAll(/<line x1="([-\d.]+)" y1="([-\d.]+)" x2="([-\d.]+)" y2="[-\d.]+"[^>]*stroke-width="([\d.]+)"/g)].map((m) => {
    const t = +m[4];
    return { x0: +m[1], x1: +m[3], top: +m[2] - t / 2, thickness: t };
  });
  return { lines, rules, svg };
}

// ── PowerPoint side ────────────────────────────────────────────────────

interface PLine { offset: number; length: number; left: number; top: number; width: number; height: number; text: string; baseline: number | null; glyphRuns: { x: number; y: number; size: number; font: string; bytes: number }[]; rules: { x0: number; x1: number; top: number; thickness: number }[]; bulletText?: string }
interface PdfWord { x0: number; y0: number; x1: number; y1: number; text: string }
interface PCase { shape: { left: number; top: number; width: number; height: number }; lines: PLine[]; chars: { offset: number; left: number; width: number }[] }

const num = (s: string) => parseFloat(s.replace(',', '.'));

async function writeDeck(widths: Map<string, number>): Promise<void> {
  mkdirSync(SANDBOX, { recursive: true });
  const pres = new pptxgen();
  pres.defineLayout({ name: 'TF', width: 10, height: 7.5 });
  pres.layout = 'TF';
  for (const c of CASES) {
    pres.addSlide().addText(`@@${c.name}@@`, {
      x: BOX.x / 72, y: BOX.y / 72, w: widths.get(c.name)! / 72, h: BOX.h / 72,
      margin: 0, objectName: c.name, fit: 'none', valign: 'top', fontFace: c.font,
    });
  }
  const raw = join(SANDBOX, 'raw.pptx');
  await pres.writeFile({ fileName: raw });
  const dir = join(SANDBOX, 'build');
  rmSync(dir, { recursive: true, force: true });
  execFileSync('unzip', ['-q', raw, '-d', dir]);
  CASES.forEach((c, i) => {
    const f = join(dir, `ppt/slides/slide${i + 1}.xml`);
    let xml = readFileSync(f, 'utf8');
    if (!xml.includes(`name="${c.name}"`)) throw new Error(`slide${i + 1}.xml has no shape ${c.name}`);
    xml = xml.replace(/<a:bodyPr[^>]*?(\/>|>[^]*?<\/a:bodyPr>)/, '<a:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="t"><a:noAutofit/></a:bodyPr>');
    xml = xml.replace(/<a:lstStyle\/>[^]*?<\/p:txBody>/, `<a:lstStyle/>${c.paras.map((q) => paraXml(q, c.font)).join('')}</p:txBody>`);
    writeFileSync(f, xml);
  });
  rmSync(DECK, { force: true });
  execFileSync('zip', ['-q', '-X', DECK, '[Content_Types].xml'], { cwd: dir });
  execFileSync('zip', ['-q', '-X', '-r', DECK, '.', '-x', '[Content_Types].xml'], { cwd: dir });
  rmSync(dir, { recursive: true, force: true });
  rmSync(raw, { force: true });
}

/** Words with their boxes per page (`pdftotext -bbox`), slide space, y down. Empty when poppler is missing. */
function readPdfWords(pdf: string): PdfWord[][] {
  let html: string;
  try { html = execFileSync('pdftotext', ['-bbox', pdf, '-'], { encoding: 'utf8', maxBuffer: 64 << 20 }); } catch { return []; }
  const unesc = (t: string) => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  return html.split('<page ').slice(1).map((pg) => [...pg.matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)]
    .map((m) => ({ x0: +m[1], y0: +m[2], x1: +m[3], y1: +m[4], text: unesc(m[5]) })));
}

function measureInPowerPoint(): { tsv: string; pages: PdfPage[]; words: PdfWord[][]; version: string } {
  const deck = join(SANDBOX, 'text-features.pptx');
  const pdf = join(SANDBOX, 'text-features.pdf');
  copyFileSync(DECK, deck);
  rmSync(pdf, { force: true });
  const tsv = execFileSync('osascript', [join(HERE, 'measure-text-features.applescript'), deck, pdf], { encoding: 'utf8', maxBuffer: 64 << 20, timeout: 600_000 });
  const version = execFileSync('osascript', ['-e', 'tell application "Microsoft PowerPoint" to get version'], { encoding: 'utf8' }).trim();
  return { tsv, pages: readPdfGeometry(pdf), words: readPdfWords(pdf), version };
}

function parseMeasurements(tsv: string, pages: PdfPage[], words: PdfWord[][]): Map<string, PCase> {
  const bySlide = new Map<number, PCase & { name: string }>();
  for (const row of tsv.split('\n')) {
    const f = row.split('\t');
    const si = +f[1];
    if (f[0] === 'S') bySlide.set(si, { name: f[2], shape: { left: num(f[3]), top: num(f[4]), width: num(f[5]), height: num(f[6]) }, lines: [], chars: [] });
    const c = bySlide.get(si);
    if (!c) continue;
    if (f[0] === 'L') c.lines.push({ offset: +f[3], length: +f[4], left: r2(num(f[5]) - c.shape.left), top: r2(num(f[6]) - c.shape.top), width: r2(num(f[7])), height: r2(num(f[8])), text: f.slice(9).join('\t'), baseline: null, glyphRuns: [], rules: [] });
    if (f[0] === 'C') c.chars.push({ offset: +f[2], left: r2(num(f[3]) - c.shape.left), width: r2(num(f[4])) });
  }
  const out = new Map<string, PCase>();
  for (const [si, c] of bySlide) {
    const page = pages[si - 1];
    if (page) {
      const { left, top } = c.shape;
      // a glyph run belongs to the line box holding its baseline; a subscript
      // can sit below its box — then the nearest line above it
      const lineOf = (y: number) => c.lines.find((l) => y >= l.top - 0.5 && y <= l.top + l.height + 0.5)
        ?? [...c.lines].reverse().find((l) => y > l.top + l.height && y <= l.top + 2 * l.height);
      for (const t of page.texts) {
        const y = t.y - top;
        const ln = lineOf(y);
        if (ln) ln.glyphRuns.push({ x: r2(t.x - left), y: r2(y), size: r2(t.size), font: t.font, bytes: t.bytes });
      }
      for (const l of c.lines) {
        if (l.glyphRuns.length) {
          const ys = page.texts.filter((t) => t.y - top >= l.top - 0.5 && t.y - top <= l.top + l.height + 0.5).map((t) => t.y - top).sort((a, b) => a - b);
          l.baseline = r2(ys[Math.floor(ys.length / 2)]);
        }
      }
      // list markers: the words left of the line's first character
      for (const l of c.lines) {
        const first = c.chars.find((ch) => ch.offset >= l.offset && ch.offset < l.offset + l.length);
        if (!first || l.baseline == null) continue;
        const bl = l.baseline + top;
        const ws = (words[si - 1] ?? []).filter((w) => w.x1 - left <= first.left + 0.5 && bl >= w.y0 && bl <= w.y1 + 1 && w.x0 >= left - 1);
        if (ws.length) l.bulletText = ws.map((w) => w.text).join(' ');
      }
      for (const fl of page.fills) {
        const h = fl.y1 - fl.y0;
        if (fl.x1 - fl.x0 > page.width * 0.9 || h <= 0 || h > 12) continue;
        const y0 = fl.y0 - top;
        const mid = (fl.y0 + fl.y1) / 2 - top;
        // underline / strike rules: the line box that holds the rule's centre
        const ln = c.lines.find((l) => l.baseline != null && mid >= l.top && mid <= l.top + l.height + 1);
        if (ln) ln.rules.push({ x0: r2(fl.x0 - left), x1: r2(fl.x1 - left), top: r2(y0), thickness: r2(h) });
      }
    }
    out.set(c.name, { shape: c.shape, lines: c.lines, chars: c.chars });
  }
  return out;
}

// ── comparison ─────────────────────────────────────────────────────────

// a soft hyphen PowerPoint broke at is shown as '-' by vyaz
const norm = (s: string) => s.replace(/[⏎↵\n]/g, '').replace(/\u00AD$/, '-');
const show = (s: string) => JSON.stringify(s.replace(/⏎$/, ''));

function paraStarts(c: Case): number[] {
  const starts: number[] = [];
  let off = 1;
  for (const q of c.paras) { starts.push(off); off += paraText(q).length + 1; }
  return starts;
}

/** PowerPoint chars of a line (excluding the paragraph-end ⏎) with their offsets. */
function pptLineChars(pc: PCase, l: PLine) {
  return pc.chars.filter((ch) => ch.offset >= l.offset && ch.offset < l.offset + l.length);
}

function compareCase(c: Case, pc: PCase, v: ReturnType<typeof vyazLines>, md: string[]) {
  const starts = paraStarts(c);
  const fullText = c.paras.map(paraText).join('\r');
  md.push(`\n#### \`${c.name}\` — width ${c.width}pt, ${c.font}${c.note ? ` — ${c.note}` : ''}\n`);
  const rows: string[] = [];
  const n = Math.max(pc.lines.length, v.lines.length);
  if (c.group === 'underline') {
    rows.push('| line | PPT baseline | PPT rule top−bl / thick / x0…x1 | vyaz baseline | vyaz glyph-SVG rule top−bl / thick / x0…x1 |', '|---|---|---|---|---|');
    for (let i = 0; i < n; i++) {
      const pl = pc.lines[i], vl = v.lines[i];
      const pr = pl?.rules.map((q) => `${r2(q.top - pl.baseline!)} / ${q.thickness} / ${q.x0}…${q.x1}`).join('; ') || '—';
      const vr = vl ? v.rules.filter((q) => q.top >= vl.y && q.top <= vl.y + vl.height).map((q) => `${r2(q.top - vl.baseline)} / ${q.thickness} / ${r2(q.x0)}…${r2(q.x1)}`).join('; ') || '—' : '—';
      rows.push(`| ${show(pl?.text ?? vl?.text ?? '')} | ${pl?.baseline ?? '—'} | ${pr} | ${vl?.baseline ?? '—'} | ${vr} |`);
    }
  } else if (c.group === 'list' || c.group === 'level') {
    rows.push('| line | PPT bullet x / size (text) | vyaz marker x / size (text) | PPT text x | vyaz text x | PPT top | vyaz y |', '|---|---|---|---|---|---|---|');
    for (let i = 0; i < n; i++) {
      const pl = pc.lines[i], vl = v.lines[i];
      const first = pl ? pptLineChars(pc, pl)[0] : undefined;
      const bullet = pl && first ? pl.glyphRuns.find((g) => g.x < first.left - 0.3) : undefined;
      const bText = pl?.bulletText ? ` (${JSON.stringify(pl.bulletText)})` : '';
      rows.push(`| ${show(pl?.text ?? vl?.text ?? '')} | ${bullet ? `${bullet.x} / ${bullet.size}${bText}` : '—'} | ${vl?.marker ? `${vl.marker.x} / ${r2(vl.marker.size)} (${JSON.stringify(vl.marker.text)})` : '—'} | ${first?.left ?? '—'} | ${vl?.textX ?? '—'} | ${pl?.top ?? '—'} | ${vl?.y ?? '—'} |`);
    }
  } else if (c.group === 'baseline') {
    // the PDF puts each baseline on a whole point of the slide: PowerPoint's own lies within ±0.5 of it
    rows.push('| line | PPT top / h | vyaz y / h | PPT baseline (PDF, ±0.5) | vyaz baseline | Δ | vyaz ratio | PPT ratio range |', '|---|---|---|---|---|---|---|---|');
    for (let i = 0; i < n; i++) {
      const pl = pc.lines[i], vl = v.lines[i];
      let range = '—';
      if (pl?.baseline != null) {
        const whole = Math.round(pc.shape.top + pl.baseline) - pc.shape.top - pl.top;
        range = `${(whole - 0.5) / pl.height > 0 ? ((whole - 0.5) / pl.height).toFixed(4) : '—'}…${((whole + 0.5) / pl.height).toFixed(4)}`;
      }
      rows.push(`| ${show(pl?.text ?? vl?.text ?? '')} | ${pl ? `${pl.top} / ${pl.height}` : '—'} | ${vl ? `${vl.y} / ${vl.height}` : '—'} | ${pl?.baseline ?? '—'} | ${vl?.baseline ?? '—'} | ${pl?.baseline != null && vl ? r2(pl.baseline - vl.baseline) : '—'} | ${vl ? ((vl.baseline - vl.y) / vl.height).toFixed(4) : '—'} | ${range} |`);
    }
  } else {
    rows.push('| # | PPT line [offset in para) | vyaz line [startIndex,endIndex) p | PPT top / h | vyaz y / h | max \\|Δx\\| chars | PPT ink right | vyaz ink right |', '|---|---|---|---|---|---|---|---|');
    for (let i = 0; i < n; i++) {
      const pl = pc.lines[i], vl = v.lines[i];
      let pRange = '—';
      let dx = '—', pRight = '—', vRight = '—';
      if (pl) {
        const pi = starts.findLastIndex((s) => s <= pl.offset);
        const rel = pl.offset - starts[pi];
        pRange = `${show(pl.text)} [${rel},${rel + pl.length - (pl.text.endsWith('⏎') ? 1 : 0)}) p${pi}`;
        const pcs = pptLineChars(pc, pl).filter((ch) => !/[\r\v]/.test(fullText[ch.offset - 1] ?? ''));
        const ink = pcs.filter((ch) => !/\s/.test(fullText[ch.offset - 1]));
        if (ink.length) pRight = String(r2(Math.max(...ink.map((ch) => ch.left + ch.width))));
        if (vl) {
          const vInk = vl.chars.filter((ch) => !/\s/.test(ch.ch));
          if (vInk.length) vRight = String(r2(Math.max(...vInk.map((ch) => ch.x + ch.w))));
          const pt = pcs.map((ch) => fullText[ch.offset - 1]).join('');
          if (norm(pt) === norm(vl.text.replace(/\n/g, ''))) {
            const vcs = vl.chars.filter((ch) => ch.ch !== '\n');
            dx = String(r2(Math.max(0, ...pcs.map((ch, k) => (vcs[k] ? Math.abs(ch.left - vcs[k].x) : 0)))));
          } else dx = 'text differs';
        }
      }
      const vRange = vl ? `${show(vl.text)} [${vl.startIndex},${vl.endIndex}) p${vl.pIdx ?? '∅'}` : '—';
      rows.push(`| ${i} | ${pRange} | ${vRange} | ${pl ? `${pl.top} / ${pl.height}` : '—'} | ${vl ? `${vl.y} / ${vl.height}` : '—'} | ${dx} | ${pRight} | ${vRight} |`);
    }
  }
  md.push(...rows);
  if (c.group === 'script') {
    md.push('', '| line | PPT glyph runs: x / size / y−line top | vyaz runs: x / size / baseline+shift−y |', '|---|---|---|');
    for (let i = 0; i < n; i++) {
      const pl = pc.lines[i], vl = v.lines[i];
      const pr = pl?.glyphRuns.map((g) => `${g.x} / ${g.size} / ${r2(g.y - pl.top)}`).join('; ') || '—';
      const vr = vl?.runs.map((q) => `${q.x} / ${q.size} / ${r2(vl.baseline + q.shift - vl.y)}`).join('; ') || '—';
      md.push(`| ${show(pl?.text ?? vl?.text ?? '')} | ${pr} | ${vr} |`);
    }
  }
}

// ── main ───────────────────────────────────────────────────────────────

async function main() {
  const cached = process.argv.includes('--cached');
  const svgOut = process.argv.includes('--svg-out') ? process.argv[process.argv.indexOf('--svg-out') + 1] : undefined;
  if (svgOut) mkdirSync(svgOut, { recursive: true });
  for (const [family, weight, file] of FONT_FILES) {
    await fontMetricsProvider.registerFont(family, { weight, style: 'normal' }, readFileSync(file));
  }
  // hyphen boxes: ~60% of the token's natural office width, so it must break somewhere
  const widths = new Map<string, number>();
  for (const c of CASES) {
    if (c.width) { widths.set(c.name, c.width); continue; }
    const natural = layoutTextFrame({ ...toTextFrame(c, 10_000), width: undefined, wrap: false } as any, { mode: 'office' }).lines[0].width;
    widths.set(c.name, Math.round(natural * 0.6));
  }

  let ppt: Record<string, PCase>;
  let version: string;
  if (cached) {
    const frozen = JSON.parse(readFileSync(JSON_OUT, 'utf8'));
    ppt = Object.fromEntries(frozen.cases.map((c: any) => [c.name, c.ppt]));
    version = frozen.powerpoint;
  } else {
    await writeDeck(widths);
    const m = measureInPowerPoint();
    ppt = Object.fromEntries(parseMeasurements(m.tsv, m.pages, m.words));
    version = m.version;
  }

  const md: string[] = [
    '# text-features — PowerPoint vs vyaz `mode: \'office\'`',
    '',
    `Generated by \`text-features-run.ts\` (PowerPoint for Mac ${version}). PowerPoint numbers come from its object model`,
    '(line / character bounds) and its Save-as-PDF (baselines, bullet glyphs, underline rules — the PDF snaps rules and',
    'baselines to whole slide points). All x / y are pt from the TextBox origin (insets 0). vyaz underline = the `glyph`',
    'SVG preset rule.',
  ];
  const fontInfo: Record<string, { underlinePosition: number; underlineThickness: number; unitsPerEm: number }> = {};
  for (const [family, weight, file] of FONT_FILES) {
    if (weight !== 'normal') continue;
    const f = (fontkit as any).openSync(file);
    fontInfo[family] = { underlinePosition: f.underlinePosition, underlineThickness: f.underlineThickness, unitsPerEm: f.unitsPerEm };
  }
  md.push('', `Font post table: ${Object.entries(fontInfo).map(([k, f]) => `${k} underlinePosition ${f.underlinePosition}, underlineThickness ${f.underlineThickness} / ${f.unitsPerEm}`).join('; ')}`);

  const frozenCases: any[] = [];
  let group = '';
  for (const c of CASES) {
    const width = widths.get(c.name)!;
    const v = vyazLines(c, width);
    if (svgOut) writeFileSync(join(svgOut, `${c.name}.svg`), v.svg);
    const pc = ppt[c.name];
    if (!pc) { md.push(`\n**${c.name}: no PowerPoint measurement**`); continue; }
    if (c.group !== group) { group = c.group; md.push(`\n## ${group}`); }
    compareCase({ ...c, width }, pc, v, md);
    frozenCases.push({ name: c.name, group: c.group, width, font: c.font, note: c.note, ppt: pc, vyaz: { lines: v.lines.map(({ chars, ...rest }) => rest), rules: v.rules } });
  }
  if (!cached) writeFileSync(JSON_OUT, JSON.stringify({ powerpoint: version, generated: new Date().toISOString().slice(0, 10), fontInfo, cases: frozenCases }, null, 1) + '\n');
  writeFileSync(REPORT, md.join('\n') + '\n');
  console.log(`wrote ${REPORT}${cached ? '' : `, ${JSON_OUT}, ${DECK}`}`);
}

await main();
