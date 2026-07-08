/**
 * bug-render-office.ts — рендеринг bug.json в Office-режиме (OS/2 метрики + PowerPoint SVG).
 *
 * Input:  ../../bug.json (RichTextDocument)
 * Output: ../../bug-output-office.svg
 *
 * Запуск: npx tsx packages/demo/bug-render-office.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');

import {
  ParagraphLayoutEngine,
  renderToSVG,
  fontMetricsProvider,
} from '@vyaz/core';
import type { TextFrame, LineBox } from '@vyaz/core';

// ── Register font ─────────────────────────────────────────────────────

const unifontPath = join(rootDir, 'unifont-17.0.04.otf');
const fontBuffer = readFileSync(unifontPath);

await fontMetricsProvider.registerFont('Unifont', { weight: 'normal', style: 'normal' }, fontBuffer);
await fontMetricsProvider.registerFont('Unifont', { weight: 'bold', style: 'normal' }, fontBuffer);

// ── Switch to Office mode ─────────────────────────────────────────────

fontMetricsProvider.setMode('office');
console.log('Mode:', fontMetricsProvider.getMode());

// ── Load bug.json ─────────────────────────────────────────────────────

const bugPath = join(rootDir, 'bug.json');
const doc: TextFrame = JSON.parse(readFileSync(bugPath, 'utf-8'));

// ── Layout ─────────────────────────────────────────────────────────────

const engine = new ParagraphLayoutEngine();
const maxWidth = doc.autofit?.maxWidth ?? 800;

const allLines: LineBox[] = [];
let totalHeight = 0;

console.log('=== Bug Render (Office mode) ===\n');
console.log(`Document: ${doc.paragraphs.length} paragraph(s), maxWidth=${maxWidth}`);

for (const paragraph of doc.paragraphs) {
  // Передаём fontProvider — используется office mode
  const result = engine.layout(paragraph, maxWidth, fontMetricsProvider);

  console.log(`\nParagraph: ${result.lines.length} line(s), height=${result.height}px`);
  for (const line of result.lines) {
    console.log(`  Line y=${line.y} width=${line.width} fragments=${line.fragments.length}`);
    for (const frag of line.fragments) {
      console.log(
        `    "${frag.text.substring(0, 40)}..." x=${frag.x} w=${frag.width} ${frag.fontMetrics.fontSize}px`
      );
    }
  }

  allLines.push(...result.lines);
  totalHeight += result.height;
}

// ── SVG (PowerPoint mode) ─────────────────────────────────────────────

const padding = 20;
const svgWidth = maxWidth + padding * 2;
const svgHeight = totalHeight + padding * 2;

const svg = renderToSVG(allLines, {
  width: svgWidth,
  height: svgHeight,
  mode: 'default',
  textLength: true,
});

const svgPath = join(rootDir, 'bug-output-office.svg');
writeFileSync(svgPath, svg, 'utf-8');
console.log(`\nSVG written to: ${svgPath}`);
console.log('=== Done ===');