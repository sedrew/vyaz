/**
 * parse-pptx.ts — pull the calibration groups out of `font-metrics.pptx`.
 *
 * The deck is a set of PowerPoint groups, each holding
 *   • a `TextBox` shape  — the sample text (font `a:latin`, size `a:rPr@sz`)
 *   • a plain `rect`      — hand-fitted by the author to the text-selection box
 *     (the highlight PowerPoint paints when you select the line), no insets.
 *
 * We read the group's child→parent transform (`a:xfrm` ext / chExt) so the
 * rect's EMU size is converted to real on-slide EMU, then to px / pt.
 *
 * OOXML is regular enough here (one flat level of `p:grpSp`, two `p:sp` each)
 * that a few scoped regexes beat pulling in an XML parser.
 */
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EMU_PER_IN = 914400;
export const EMU_PER_PT = 12700; // 1pt = 1/72in
export const EMU_PER_PX = 9525; // 1 CSS px = 1/96in

const HERE = dirname(fileURLToPath(import.meta.url));
export const PPTX = resolve(HERE, 'font-metrics.pptx');

export interface Run {
  text: string;
  /** points (OOXML `sz` is 1/100 pt; default 18pt when absent) */
  sizePt: number;
  family: string;
  bold: boolean;
  italic: boolean;
}

export interface Group {
  name: string;
  /** sample runs, in order */
  runs: Run[];
  /** paragraph count (`a:p`) and hard breaks (`a:br`) inside the TextBox */
  paragraphs: number;
  breaks: number;
  /** hand-fitted rect, converted to real on-slide units */
  rect: { wPx: number; hPx: number; wPt: number; hPt: number };
  /** the spAutoFit TextBox extent, same conversion (incl. PowerPoint insets) */
  box: { wPx: number; hPx: number; wPt: number; hPt: number };
}

const num = (s: string | undefined, d = 0) => (s == null ? d : Number(s));

function firstXfrm(xml: string): { ext: [number, number]; chExt: [number, number] } {
  const ext = /<a:ext\s+cx="(\d+)"\s+cy="(\d+)"\/>/.exec(xml);
  const ch = /<a:chExt\s+cx="(\d+)"\s+cy="(\d+)"\/>/.exec(xml);
  const e: [number, number] = ext ? [num(ext[1]), num(ext[2])] : [1, 1];
  return { ext: e, chExt: ch ? [num(ch[1]), num(ch[2])] : e };
}

function spExt(spXml: string): [number, number] {
  const m = /<a:off\s+x="-?\d+"\s+y="-?\d+"\/>\s*<a:ext\s+cx="(\d+)"\s+cy="(\d+)"\/>/.exec(spXml);
  return m ? [num(m[1]), num(m[2])] : [0, 0];
}

function parseRuns(boxXml: string): Run[] {
  const runs: Run[] = [];
  const re = /<a:r>([\s\S]*?)<\/a:r>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(boxXml))) {
    const r = m[1];
    const rPr = /<a:rPr\b([^>]*)>/.exec(r)?.[1] ?? '';
    const sz = /\bsz="(\d+)"/.exec(rPr)?.[1];
    const bold = /\bb="1"/.test(rPr);
    const italic = /\bi="1"/.test(rPr);
    const family = /<a:latin\s+typeface="([^"]+)"/.exec(r)?.[1] ?? 'Roboto';
    const text = (/<a:t>([\s\S]*?)<\/a:t>/.exec(r)?.[1] ?? '').replace(/&amp;/g, '&');
    runs.push({ text, sizePt: sz ? Number(sz) / 100 : 18, family, bold, italic });
  }
  return runs;
}

export function parsePptx(pptxPath = PPTX): Group[] {
  const slide = spawnSync('unzip', ['-p', pptxPath, 'ppt/slides/slide1.xml'], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  }).stdout;
  if (!slide) throw new Error(`could not read slide1.xml from ${pptxPath}`);

  const groups: Group[] = [];
  const gRe = /<p:grpSp>([\s\S]*?)<\/p:grpSp>/g;
  let g: RegExpExecArray | null;
  while ((g = gRe.exec(slide))) {
    const gx = g[1];
    const name = /<p:cNvPr\s+id="\d+"\s+name="([^"]*)"/.exec(gx)?.[1] ?? '?';
    const { ext, chExt } = firstXfrm(gx);
    const sx = ext[0] / chExt[0];
    const sy = ext[1] / chExt[1];

    const sps = [...gx.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)].map((m) => m[1]);
    const rectSp = sps.find((s) => !/txBox="1"/.test(s) && /<a:ln\b/.test(s));
    const boxSp = sps.find((s) => /txBox="1"/.test(s));
    if (!rectSp || !boxSp) continue;

    const [rcx, rcy] = spExt(rectSp);
    const [bcx, bcy] = spExt(boxSp);
    const conv = (cx: number, cy: number, kx: number, ky: number) => ({
      wPx: (cx * kx) / EMU_PER_PX,
      hPx: (cy * ky) / EMU_PER_PX,
      wPt: (cx * kx) / EMU_PER_PT,
      hPt: (cy * ky) / EMU_PER_PT,
    });

    groups.push({
      name,
      runs: parseRuns(boxSp),
      paragraphs: (boxSp.match(/<a:p>/g) ?? []).length,
      breaks: (boxSp.match(/<a:br\b/g) ?? []).length,
      rect: conv(rcx, rcy, sx, sy),
      box: conv(bcx, bcy, sx, sy),
    });
  }
  return groups;
}

if (import.meta.main) {
  for (const g of parsePptx()) {
    console.log(
      `${g.name.padEnd(20)} rect ${g.rect.wPx.toFixed(1)}×${g.rect.hPx.toFixed(1)}px ` +
        `(${g.rect.hPt.toFixed(2)}pt)  box ${g.box.hPx.toFixed(1)}px  ¶${g.paragraphs}+br${g.breaks}`,
    );
    for (const r of g.runs) console.log(`   ${r.sizePt}pt ${r.family}${r.bold ? ' bold' : ''}  ${JSON.stringify(r.text)}`);
  }
}
