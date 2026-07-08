/**
 * bug-render.ts — рендеринг bug.json через новый API.
 *
 * Input:  ../../bug.json (RichTextDocument)
 * Output: ../../bug-output.svg, ../../bug-output.png, ../../bug-output.yaml
 *
 * Запуск: npx tsx packages/demo/bug-render.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, Canvas } from '@napi-rs/canvas';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');

import {
  ParagraphLayoutEngine,
  renderToSVG,
  renderToCanvas,
  lineBoxToYAML,
} from '@vyaz/core';
import type { TextFrame, LineBox } from '@vyaz/core';

// ── Load bug.json ──────────────────────────────────────────────────────

const bugPath = join(rootDir, 'bug.json');
const doc: TextFrame = JSON.parse(readFileSync(bugPath, 'utf-8'));

// ── Layout ─────────────────────────────────────────────────────────────

const engine = new ParagraphLayoutEngine();
const maxWidth = doc.autofit?.maxWidth ?? 800;

const allLines: LineBox[] = [];
let totalHeight = 0;

console.log('=== Bug Render ===\n');
console.log(`Document: ${doc.paragraphs.length} paragraph(s), maxWidth=${maxWidth}`);

for (const paragraph of doc.paragraphs) {
  const result = engine.layout(paragraph, maxWidth);

  console.log(`\nParagraph: ${result.lines.length} line(s), height=${result.height}px`);
  for (const line of result.lines) {
    console.log(`  Line y=${line.y} width=${line.width} fragments=${line.fragments.length}`);
    for (const frag of line.fragments) {
      console.log(`    "${frag.text.substring(0, 40)}..." x=${frag.x} w=${frag.width} ${frag.fontMetrics.fontSize}px`);
    }
  }

  allLines.push(...result.lines);
  totalHeight += result.height;
}

// ── SVG ────────────────────────────────────────────────────────────────

const padding = 20;
const svgWidth = maxWidth + padding * 2;
const svgHeight = totalHeight + padding * 2;

const svg = renderToSVG(allLines, {
  width: svgWidth,
  height: svgHeight,
  mode: 'canva',
});

const svgPath = join(rootDir, 'bug-output.svg');
writeFileSync(svgPath, svg, 'utf-8');
console.log(`\nSVG written to: ${svgPath}`);

// ── Canvas PNG ─────────────────────────────────────────────────────────

const canvas: Canvas = createCanvas(svgWidth, svgHeight);
const ctx = canvas.getContext('2d');

renderToCanvas(ctx, allLines, {
  width: svgWidth,
  height: svgHeight,
  backgroundColor: '#ffffff',
});

const pngPath = join(rootDir, 'bug-output.png');
writeFileSync(pngPath, canvas.toBuffer('image/png'));
console.log(`PNG written to: ${pngPath}`);

// ── YAML ───────────────────────────────────────────────────────────────

const yaml = lineBoxToYAML(allLines, maxWidth, totalHeight);
const yamlPath = join(rootDir, 'bug-output.yaml');
writeFileSync(yamlPath, yaml, 'utf-8');
console.log(`YAML written to: ${yamlPath}`);

console.log('\n=== Done ===');