/**
 * overlay-slides.ts — render a few cases as RED transparent PNGs for the
 * in-PowerPoint overlay check.
 *
 *   bun scripts/office-visual-diff/overlay-slides.ts [case ...]
 *   python3 scripts/office-visual-diff/overlay-slides.py
 *   → _overlay.pptx : per slide, the native PowerPoint text box (black) with
 *     the vyaz glyph render (red, transparent) pinned on top at the same origin
 *     and size. Where they agree the red sits on the black; drift shows as red
 *     or black sticking out.
 *
 * Writes overlay/<slug>.png + overlay/_plan.json (consumed by the .py).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { PNG } from 'pngjs';
import { HERE, CORPUS, registerOfficeFonts, resvgFontFiles } from './lib.ts';

const OVERLAY_DIR = resolve(HERE, 'overlay');
mkdirSync(OVERLAY_DIR, { recursive: true });
const slug = (n: string) => n.replace(/\//g, '__');

const CASES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      'rich-text-v1/frame',          // covers ~everything (42 paragraphs)
      'writing-mode/rotate-180',     // frame rotation
      'writing-mode/rotate-270',
      'writing-mode/sideways-lr',    // vertical placement inside frame
      'writing-mode/sideways-rl',
    ];

/** px per pt for the rendered overlay — must match overlay-slides.py's DPI note */
const PPP = 4;

await registerOfficeFonts();
const { layoutTextFrame } = await import('../../packages/core/src/index.ts');
const { renderToSVG } = await import('../../packages/renderers/src/index.ts');
const fontFiles = resvgFontFiles();

const plan: {
  slug: string; name: string; frameWidth: number | null;
  contentWpt: number; contentHpt: number; firstLeadingPt: number; ppp: number;
}[] = [];

for (const name of CASES) {
  const input = JSON.parse(readFileSync(resolve(CORPUS, name, 'input.json'), 'utf8'));
  const result = layoutTextFrame(input.frame, { mode: 'office', onMissingFont: 'substitute' });

  // flat preset: one <text> per line at vyaz's line origin — the glyph engine
  // (resvg / PowerPoint) fills each line itself. So the overlay tests vyaz's
  // line boxes + wrap decisions, not per-glyph advance.
  const svg = renderToSVG(result, {
    preset: 'flat',
    sizing: { horizontal: 'content', vertical: 'content' },
    contentPadding: 0,
  });
  const r = new Resvg(svg, {
    background: 'rgba(0,0,0,0)',
    fitTo: { mode: 'zoom', value: PPP },
    font: fontFiles.length
      ? { fontFiles, loadSystemFonts: false, defaultFontFamily: 'Arial' }
      : { loadSystemFonts: true, defaultFontFamily: 'Arial' },
  });
  const png = PNG.sync.read(r.render().asPng());
  // recolour every painted pixel red, keep its alpha (anti-aliased edges stay soft)
  for (let i = 0; i < png.data.length; i += 4) {
    if (png.data[i + 3] > 8) { png.data[i] = 255; png.data[i + 1] = 0; png.data[i + 2] = 0; }
  }
  writeFileSync(resolve(OVERLAY_DIR, `${slug(name)}.png`), PNG.sync.write(png));

  // vyaz's content box starts at the first glyph's ascent top; a PowerPoint
  // text box puts leading ABOVE the first line. Shift the picture down by that
  // leading so first baselines coincide.
  const l0 = result.lines[0];
  const firstLeadingPt = l0 ? Math.max(0, l0.baseline - l0.ascent) : 0;

  plan.push({
    slug: slug(name), name,
    frameWidth: input.frame.width ?? null,
    contentWpt: result.content.width,
    contentHpt: result.content.height,
    firstLeadingPt,
    ppp: PPP,
  });
  console.log(`${name}  content ${result.content.width.toFixed(1)}×${result.content.height.toFixed(1)}pt  ${png.width}×${png.height}px`);
}

writeFileSync(resolve(OVERLAY_DIR, '_plan.json'), JSON.stringify({ plan }, null, 2));
console.log(`\nwrote overlay/ (${plan.length} cases) → now: python3 scripts/office-visual-diff/overlay-slides.py`);
