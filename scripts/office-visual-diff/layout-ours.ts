/**
 * layout-ours.ts — vyaz side of the office parity experiment.
 *
 *   bun scripts/office-visual-diff/layout-ours.ts
 *
 * For every case in _manifest.json: layoutTextFrame(frame, { mode: 'office' }),
 * record the geometry (content box + per-line boxes), render the glyph-preset
 * SVG and rasterise it with resvg. Writes ours/<slug>.json + ours/<slug>.png.
 *
 * No PowerPoint needed — run any time. diff.ts joins this with refs/.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import {
  HERE, CORPUS, MANIFEST, OURS_DIR, SLIDE_W_PT, registerOfficeFonts, resvgFontFiles,
} from './lib.ts';

const slug = (name: string) => name.replace(/\//g, '__');

const { slides } = JSON.parse(readFileSync(MANIFEST, 'utf8')) as {
  slides: { slide: number; name: string; box: [number, number, number] }[];
};

const families = await registerOfficeFonts();
console.log(`registered: ${families.join(', ')}`);

const { layoutTextFrame } = await import('../../packages/core/src/index.ts');
const { renderToSVG } = await import('../../packages/renderers/src/index.ts');

const fontFiles = resvgFontFiles();
/** rasterise at this many px per pt (ref export DPI is derived, not matched here) */
const PPP = Number(process.env.OFFICE_DIFF_PPP ?? 3);

interface LineGeom { i: number; x: number; y: number; w: number; h: number; baseline: number; ascent: number; descent: number }
interface OursCase {
  name: string; nLines: number; contentWpt: number; contentHpt: number;
  domFontPt: number; lines: LineGeom[]; ppp: number; pngW: number; pngH: number;
}

let ok = 0, fail = 0;
for (const s of slides) {
  const input = JSON.parse(readFileSync(resolve(CORPUS, s.name, 'input.json'), 'utf8'));
  const frame = input.frame;
  try {
    const result = layoutTextFrame(frame, { mode: 'office', glyphAdvances: true, onMissingFont: 'substitute' });
    if (result.content.width < 1 || result.content.height < 1) {
      console.warn(`  – ${s.name}: empty content, skipped`);
      fail++;
      continue;
    }
    const lines: LineGeom[] = result.lines.map((l: any, i: number) => ({
      i, x: l.x, y: l.y, w: l.width, h: l.height, baseline: l.baseline, ascent: l.ascent, descent: l.descent,
    }));
    const domFontPt = Math.max(
      ...frame.paragraphs.flatMap((p: any) =>
        (p.children ?? []).map((r: any) => Number(r.fontSize) || Number(frame.defaultStyle?.fontSize) || 16)),
    );

    const svg = renderToSVG(result, {
      preset: 'glyph',
      sizing: { horizontal: 'content', vertical: 'content' },
      contentPadding: 0,
    });
    const r = new Resvg(svg, {
      background: '#ffffff',
      fitTo: { mode: 'zoom', value: PPP },
      font: fontFiles.length
        ? { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Arial' }
        : { loadSystemFonts: true, defaultFontFamily: 'Arial' },
    });
    const png = r.render();
    const buf = png.asPng();
    writeFileSync(resolve(OURS_DIR, `${slug(s.name)}.png`), buf);

    const out: OursCase = {
      name: s.name,
      nLines: lines.length,
      contentWpt: result.content.width,
      contentHpt: result.content.height,
      domFontPt,
      lines,
      ppp: PPP,
      pngW: png.width,
      pngH: png.height,
    };
    writeFileSync(resolve(OURS_DIR, `${slug(s.name)}.json`), JSON.stringify(out, null, 2));
    ok++;
  } catch (e) {
    console.warn(`  ✗ ${s.name}: ${e}`);
    fail++;
  }
}
console.log(`\nlaid out ${ok} cases, ${fail} failed → ${OURS_DIR}`);
void HERE; void SLIDE_W_PT;
