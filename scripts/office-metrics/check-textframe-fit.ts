/**
 * check-textframe-fit.ts — numeric verdict for vyaz `textBox` vs real PowerPoint.
 *
 * Closes the "still open" question in RESULTS.md ("does PowerPoint's autofit
 * box height also carry the trailing leading, or trim it?") without a human
 * opening an SVG export and eyeballing pixels.
 *
 * Needs, next to this file:
 *   - textframe-fit.json        (bun textframe-fit-run.ts)
 *   - textframe-fit.bounds.json (bun read-powerpoint-bounds.ts textframe-fit.pptx,
 *                                 run from a normal Terminal — see that file's header)
 *
 * Per frame, three numbers should agree within noise:
 *   vyaz content.height   — CSS box: every line's full lineHeight + padding
 *   vyaz textBox.height   — trimmed: last baseline + real font descent
 *   PowerPoint <name>@fit height  — spAutoFit's own recomputed cy
 *   PowerPoint <name> textBounds  — `get rotated text bounds` ink box on the
 *                                    fixed (untrimmed-by-autofit) twin
 *
 *   bun scripts/office-metrics/check-textframe-fit.ts
 */
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TOLERANCE_PT = 1.0; // hand-fit / rounding noise budget, see RESULTS.md

const fitJsonPath = resolve(HERE, 'textframe-fit.json');
const boundsJsonPath = resolve(HERE, 'textframe-fit.bounds.json');

if (!existsSync(fitJsonPath)) {
  console.error(`missing ${fitJsonPath} — run: bun scripts/office-metrics/textframe-fit-run.ts`);
  process.exit(1);
}
if (!existsSync(boundsJsonPath)) {
  console.error(
    `missing ${boundsJsonPath} — run, from a normal (non-headless) Terminal:\n` +
      '  bun scripts/office-metrics/gen-textframe-fit.ts\n' +
      '  bun scripts/office-metrics/read-powerpoint-bounds.ts textframe-fit.pptx',
  );
  process.exit(1);
}

const fitData = JSON.parse(readFileSync(fitJsonPath, 'utf8'));
const boundsData = JSON.parse(readFileSync(boundsJsonPath, 'utf8'));

interface Shape {
  slide: number;
  name: string;
  width: number;
  height: number;
  textBoundsPt: number[]; // [x1,y1,x2,y2,x3,y3,x4,y4]
}
const shapesByName = new Map<string, Shape>();
for (const s of boundsData.shapes as Shape[]) shapesByName.set(s.name, s);

function textBoundsHeight(s: Shape | undefined): number | null {
  if (!s || !s.textBoundsPt || s.textBoundsPt.length < 8) return null;
  const ys = [s.textBoundsPt[1], s.textBoundsPt[3], s.textBoundsPt[5], s.textBoundsPt[7]];
  return Math.max(...ys) - Math.min(...ys);
}

const rows: string[] = [
  '| frame | vyaz content.height | vyaz textBox.height | PPT @fit height | Δ vs content | Δ vs textBox | PPT text-bounds H (fixed box) | verdict |',
  '|---|--:|--:|--:|--:|--:|--:|---|',
];

let anyFail = false;
for (const f of fitData.frames) {
  const fitShape = shapesByName.get(`${f.name}@fit`);
  const fixedShape = shapesByName.get(f.name);
  const pptFitHeight = fitShape?.height ?? null;
  const dContent = pptFitHeight != null ? pptFitHeight - f.vyaz.content_height : null;
  const dTextBox = pptFitHeight != null ? pptFitHeight - f.vyaz.textbox_height : null;
  const pptTextBoundsH = textBoundsHeight(fixedShape);

  const best = dContent != null && dTextBox != null ? Math.min(Math.abs(dContent), Math.abs(dTextBox)) : null;
  const verdict = best == null ? 'no data' : best <= TOLERANCE_PT ? 'PASS' : 'FAIL';
  if (verdict === 'FAIL') anyFail = true;

  rows.push(
    `| ${f.name} | ${f.vyaz.content_height.toFixed(2)} | ${f.vyaz.textbox_height.toFixed(2)} | ` +
      `${pptFitHeight != null ? pptFitHeight.toFixed(2) : '—'} | ` +
      `${dContent != null ? dContent.toFixed(2) : '—'} | ${dTextBox != null ? dTextBox.toFixed(2) : '—'} | ` +
      `${pptTextBoundsH != null ? pptTextBoundsH.toFixed(2) : '—'} | ${verdict} |`,
  );
}

const md =
  [
    '# textBox vs real PowerPoint — check-textframe-fit',
    '',
    `Oracle: \`${boundsJsonPath.split('/').slice(-1)[0]}\` (real PowerPoint, via read-powerpoint-bounds.ts).`,
    `Tolerance: ±${TOLERANCE_PT}pt.`,
    '',
    ...rows,
    '',
    '`Δ vs content` / `Δ vs textBox` — PowerPoint\'s own spAutoFit height minus each',
    'vyaz candidate. Whichever is closer to 0 says which box PowerPoint\'s autofit',
    'actually matches; see RESULTS.md "Generator picks" for how format generators',
    'should then choose between `content` and `textBox`.',
    '',
  ].join('\n') + '\n';

const outPath = resolve(HERE, 'check-textframe-fit.md');
writeFileSync(outPath, md);
console.log(md);
if (anyFail) process.exit(1);
