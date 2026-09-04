/**
 * build-page.ts — emit a self-contained calibration page.
 *
 *   bun scripts/browser-metrics/build-page.ts
 *   → writes scripts/browser-metrics/page.html
 *
 * The page embeds every fixture font as a base64 `@font-face` and the whole
 * `corpus.json`, then measures each (font, variant, string, size) two ways in
 * the real browser engine:
 *
 *   - SVG   `<text>.getComputedTextLength()`  — what the SVG `browser` preset
 *           actually relies on
 *   - Canvas `ctx.measureText(s).width` with `fontKerning: "normal"` — cross-check
 *
 * Results land on `window.__METRICS__` (and render as a table for eyeballing).
 * `capture.ts` reads `__METRICS__` and freezes it into
 * `packages/core/tests/fixtures/browser-metrics/<family>-<weight>.json`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(HERE, '../../packages/core/tests/fixtures');
const corpus = JSON.parse(readFileSync(resolve(FIXTURES, 'corpus.json'), 'utf8'));

const faces = corpus.fonts.map((f: any) => {
  const b64 = readFileSync(resolve(FIXTURES, f.file)).toString('base64');
  return { family: f.family, file: f.file, variants: f.variants, b64 };
});

const fontFaceCss = faces
  .map(
    (f: any) => `@font-face{font-family:'${f.family}';font-weight:1 1000;` +
      `src:url(data:font/ttf;base64,${f.b64}) format('truetype');}`,
  )
  .join('\n');

const html = `<!doctype html><meta charset="utf-8">
<title>vyaz — browser font metrics</title>
<style>
  ${fontFaceCss}
  body{font:13px/1.4 system-ui,sans-serif;margin:16px;color:#111}
  table{border-collapse:collapse;font-size:12px;margin-top:8px}
  th,td{border:1px solid #ddd;padding:2px 6px;text-align:right}
  th:first-child,td:first-child,td.s{text-align:left}
  .ok{color:#0a0}.warn{color:#b60}
  #status{font-weight:bold;margin-bottom:8px}
</style>
<div id="status">measuring…</div>
<table id="out"><thead><tr>
  <th>family</th><th>wght</th><th>script</th><th>cat</th><th>size</th>
  <th class="s">string</th><th>svgPx</th><th>canvasPx</th><th>Δ svg-canvas</th>
</tr></thead><tbody></tbody></table>
<svg id="stage" width="4000" height="80" style="position:absolute;left:-9999px"></svg>
<canvas id="cnv" width="10" height="10" style="display:none"></canvas>
<script id="corpus" type="application/json">${JSON.stringify(corpus)}</script>
<script>
(async () => {
  const CORPUS = JSON.parse(document.getElementById('corpus').textContent);
  const SVGNS = 'http://www.w3.org/2000/svg';
  const stage = document.getElementById('stage');
  const cctx = document.getElementById('cnv').getContext('2d');
  cctx.fontKerning = 'normal';          // browser default: kerning + ligatures on
  cctx.textRendering = 'auto';

  await document.fonts.ready;
  // force each face to load at a used size
  for (const f of CORPUS.fonts) { await document.fonts.load(\`16px '\${f.family}'\`); }

  const measureSvg = (s, family, size, varsettings) => {
    const t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('x', '0'); t.setAttribute('y', '40');
    t.setAttribute('font-family', family);
    t.setAttribute('font-size', String(size));
    t.setAttribute('xml:space', 'preserve');
    if (varsettings) t.style.fontVariationSettings = varsettings;
    t.textContent = s;
    stage.appendChild(t);
    const w = t.getComputedTextLength();
    stage.removeChild(t);
    return w;
  };
  const measureCanvas = (s, family, weight, size, varsettings) => {
    cctx.font = \`\${weight} \${size}px '\${family}'\`;
    if ('fontVariantSettings' in cctx) {} // no-op; canvas has no VF settings hook
    return cctx.measureText(s).width;
  };

  const entries = [];
  for (const f of CORPUS.fonts) {
    for (const v of f.variants) {
      const weight = v.weight || '400';
      const varsettings = v.variation
        ? Object.entries(v.variation).map(([k, n]) => \`"\${k}" \${n}\`).join(',')
        : '';
      for (const g of CORPUS.groups) {
        for (const s of g.strings) {
          for (const size of CORPUS.sizes) {
            const svgPx = measureSvg(s, f.family, size, varsettings);
            const canvasPx = measureCanvas(s, f.family, weight, size, varsettings);
            entries.push({
              family: f.family, weight, variation: v.variation || null,
              script: g.script, category: g.category, s, size,
              svgPx: Math.round(svgPx * 1000) / 1000,
              canvasPx: Math.round(canvasPx * 1000) / 1000,
            });
          }
        }
      }
    }
  }

  window.__METRICS__ = {
    meta: {
      ua: navigator.userAgent,
      dpr: window.devicePixelRatio,
      date: new Date().toISOString(),
      corpusSizes: CORPUS.sizes,
    },
    entries,
  };

  const tb = document.querySelector('#out tbody');
  for (const e of entries.filter((e) => e.size === 16)) {
    const d = e.svgPx - e.canvasPx;
    const tr = document.createElement('tr');
    tr.innerHTML =
      \`<td>\${e.family}</td><td>\${e.weight}</td><td>\${e.script}</td><td>\${e.category}</td>\` +
      \`<td>\${e.size}</td><td class="s">\${e.s.replace(/</g,'&lt;')}</td>\` +
      \`<td>\${e.svgPx.toFixed(2)}</td><td>\${e.canvasPx.toFixed(2)}</td>\` +
      \`<td class="\${Math.abs(d) > 0.5 ? 'warn' : 'ok'}">\${d.toFixed(2)}</td>\`;
    tb.appendChild(tr);
  }
  document.getElementById('status').textContent =
    \`done — \${entries.length} measurements. window.__METRICS__ ready. \` +
    \`Run: copy(JSON.stringify(window.__METRICS__))\`;
})();
</script>`;

const out = resolve(HERE, 'page.html');
writeFileSync(out, html);
console.log('wrote', out, `(${(html.length / 1024 / 1024).toFixed(1)} MB)`);
