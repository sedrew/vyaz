#!/usr/bin/env tsx
/**
 * Benchmark script — measures layout + render times.
 *
 * Usage:
 *   npx tsx packages/demo/src/benchmark.ts
 *   npx tsx packages/demo/src/benchmark.ts --warmup 20 --runs 100
 */

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Polyfill OffscreenCanvas for Node.js (needed by @chenglou/pretext)
import '../../core/src/measure/canvas-polyfill';

import { LayoutEngine, renderToSVG } from '@vyaz/core';
import type { RichTextDocument } from '@vyaz/core';

const __dirname = dirname(fileURLToPath(import.meta.url));
const inputPath = resolve(__dirname, 'input.json');

// ── CLI args ──────────────────────────────────────────────
const args = process.argv.slice(2);
const warmupCount = parseInt(args[args.indexOf('--warmup') + 1]) || 10;
const runCount = parseInt(args[args.indexOf('--runs') + 1]) || 50;
const verbose = args.includes('--verbose') || args.includes('-v');

// ── Load document ─────────────────────────────────────────
const doc = JSON.parse(readFileSync(inputPath, 'utf-8')) as RichTextDocument;

console.log(`\n📄 Benchmark: ${inputPath}`);
console.log(`   Document: ${doc.paragraphs.length}p, page ${doc.pageWidth}×${doc.pageHeight}pt`);
console.log(`   Warmup: ${warmupCount} runs, Measure: ${runCount} runs\n`);

// ── Warmup ────────────────────────────────────────────────
if (verbose) console.log('⏳ Warmup...');
for (let i = 0; i < warmupCount; i++) {
  const engine = new LayoutEngine(doc);
  engine.layout();
}

// ── Measure ───────────────────────────────────────────────
const measureTimes: number[] = [];
const svgTimes: number[] = [];

for (let i = 0; i < runCount; i++) {
  // Layout (Measure)
  const t0 = performance.now();
  const engine = new LayoutEngine(doc);
  const lines = engine.layout();
  const t1 = performance.now();
  measureTimes.push(t1 - t0);

  // SVG render
  const t2 = performance.now();
  renderToSVG(lines, { width: doc.pageWidth ?? 612, height: doc.pageHeight ?? 792 });
  const t3 = performance.now();
  svgTimes.push(t3 - t2);
}

// ── Stats ─────────────────────────────────────────────────
function stats(arr: number[]) {
  arr.sort((a, b) => a - b);
  const sum = arr.reduce((s, v) => s + v, 0);
  const avg = sum / arr.length;
  const p50 = arr[Math.floor(arr.length * 0.5)];
  const p95 = arr[Math.floor(arr.length * 0.95)];
  const p99 = arr[Math.floor(arr.length * 0.99)];
  return { avg, p50, p95, p99, min: arr[0], max: arr[arr.length - 1] };
}

const measureStats = stats(measureTimes);
const svgStats = stats(svgTimes);

// ── Output ────────────────────────────────────────────────
console.log('┌─────────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┐');
console.log('│ Phase               │   avg ms │   p50 ms │   p95 ms │   p99 ms │   max ms │');
console.log('├─────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤');

function pad(val: number): string {
  return val.toFixed(2).padStart(8);
}

console.log(`│ Measure (layout)    │ ${pad(measureStats.avg)} │ ${pad(measureStats.p50)} │ ${pad(measureStats.p95)} │ ${pad(measureStats.p99)} │ ${pad(measureStats.max)} │`);
console.log(`│ SVG render          │ ${pad(svgStats.avg)} │ ${pad(svgStats.p50)} │ ${pad(svgStats.p95)} │ ${pad(svgStats.p99)} │ ${pad(svgStats.max)} │`);

const totalAvg = measureStats.avg + svgStats.avg;
const totalP50 = measureStats.p50 + svgStats.p50;
console.log('├─────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┤');
console.log(`│ Total               │ ${pad(totalAvg)} │ ${pad(totalP50)} │`);
console.log('└─────────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┘');
console.log(`\n   Runs: ${runCount}, Lines: ${new LayoutEngine(doc).layout().length}\n`);

if (verbose) {
  console.log('Raw measure times:', measureTimes.map(t => t.toFixed(2)).join(', '));
  console.log('Raw SVG times:', svgTimes.map(t => t.toFixed(2)).join(', '));
}