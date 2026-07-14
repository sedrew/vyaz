/**
 * svg-bench-fuzz.test.ts — Bench/fuzz for SVGRenderer.
 *
 * Measures average render time + peak memory across 4 presets × 3 data sizes.
 * Uses seeded PRNG for deterministic fuzz data generation.
 *
 * Run: bun test packages/renderer/tests/svg-bench-fuzz.test.ts
 */

import { describe, test, beforeAll, expect } from 'bun:test';
import { fontMetricsProvider } from '@vyaz/core';
import type { Line, Span } from '@vyaz/core';
import { renderToSVG } from '../src/SVGRenderer.js';
import type { SvgPreset } from '../src/SVGRenderer.js';
import { registerUnifont } from './helpers.ts';

// ── Seeded PRNG (mulberry32) ──────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Lorem ipsum words ─────────────────────────────────────────────────────

const LOREM_WORDS = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing',
  'elit', 'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore',
  'et', 'dolore', 'magna', 'aliqua', 'ut', 'enim', 'ad', 'minim', 'veniam',
  'quis', 'nostrud', 'exercitation', 'ullamco', 'laboris', 'nisi', 'ut',
  'aliquip', 'ex', 'ea', 'commodo', 'consequat', 'duis', 'aute', 'irure',
  'dolor', 'in', 'reprehenderit', 'in', 'voluptate', 'velit', 'esse',
  'cillum', 'dolore', 'eu', 'fugiat', 'nulla', 'pariatur',
];

const FONT = 'Unifont';
const FONT_WEIGHTS: Array<'normal' | 'bold'> = ['normal', 'bold'];
const FONT_STYLES: Array<'normal' | 'italic'> = ['normal', 'italic'];
const SCRIPTS: Array<'normal' | 'super' | 'sub'> = ['normal', 'normal', 'normal', 'super', 'sub'];
const COLORS = ['#000000', '#FF0000', '#0000FF', '#00AA00', '#FF8800', '#8800FF'];

type StyleOverride = {
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  color: string;
  script: 'normal' | 'super' | 'sub';
  letterSpacing: number;
};

function randomStyle(rng: () => number): StyleOverride {
  return {
    fontFamily: FONT,
    fontSize: Math.round(12 + rng() * 36), // 12–48
    fontWeight: FONT_WEIGHTS[Math.floor(rng() * FONT_WEIGHTS.length)],
    fontStyle: FONT_STYLES[Math.floor(rng() * FONT_STYLES.length)],
    color: COLORS[Math.floor(rng() * COLORS.length)],
    script: SCRIPTS[Math.floor(rng() * SCRIPTS.length)],
    letterSpacing: rng() < 0.33 ? 0 : Math.round((rng() < 0.5 ? -1 : 1) * rng() * 4 * 10) / 10,
  };
}

function pickWords(rng: () => number, count: number): string {
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    words.push(LOREM_WORDS[Math.floor(rng() * LOREM_WORDS.length)]);
  }
  return words.join(' ');
}

/**
 * Generate random lines for benchmarking.
 *
 * @param totalSpans — total number of spans across all lines
 * @param seed — PRNG seed for deterministic output
 */
function generateFuzzLines(totalSpans: number, seed: number): Line[] {
  const rng = mulberry32(seed);
  const lines: Line[] = [];
  let spansRemaining = totalSpans;
  let charIndex = 0;

  while (spansRemaining > 0) {
    const spanCount = Math.min(spansRemaining, 1 + Math.floor(rng() * 10)); // 1–10 spans per line
    spansRemaining -= spanCount;

    const spans: Span[] = [];
    let lineWidth = 0;
    let lineBaseAscent = 0;
    let lineBaseDescent = 0;

    for (let i = 0; i < spanCount; i++) {
      const style = randomStyle(rng);
      const wordCount = 1 + Math.floor(rng() * 6); // 1–6 words per span
      const text = pickWords(rng, wordCount);
      const startChar = charIndex;
      charIndex += text.length;

      // Get real font metrics for Unifont at this size/weight/style
      const metrics = fontMetricsProvider.getMetrics(
        style.fontFamily,
        style.fontSize,
        style.fontWeight,
        style.fontStyle,
      );

      const scaledFontSize = style.fontSize;

      // Generate glyph advances (simple proportional mock)
      const glyphAdvances = text.split('').map(() => scaledFontSize * 0.5 * (0.8 + rng() * 0.4));

      // Approximate span width from glyph advances
      const spanWidth = glyphAdvances.reduce((a, b) => a + b, 0) + style.letterSpacing * text.length;

      // Metrics ascent/descent in px
      const metricsAscent = metrics.ascent;
      const metricsDescent = metrics.descent;
      const metricsTotalHeight = metricsAscent + metricsDescent;

      if (metricsTotalHeight > (lineBaseAscent + lineBaseDescent)) {
        lineBaseAscent = metricsAscent;
        lineBaseDescent = metricsDescent;
      }

      const span: Span = {
        text,
        type: 'text',
        itemIndex: i,
        pIdx: 0,
        x: lineWidth,
        width: spanWidth,
        fontMetrics: {
          ascent: metricsAscent,
          descent: metricsDescent,
          fontSize: scaledFontSize,
          baselineOffset: style.script === 'normal' ? 0 : (style.script === 'super' ? -metricsAscent * 0.35 : metricsDescent * 0.35),
        },
        glyphAdvances,
        style: {
          type: 'text',
          text,
          fontFamily: style.fontFamily,
          fontSize: scaledFontSize,
          fontWeight: style.fontWeight,
          fontStyle: style.fontStyle,
          color: style.color,
          underline: rng() < 0.2,
          strikethrough: rng() < 0.1,
          letterSpacing: style.letterSpacing,
          script: style.script,
        },
      };

      spans.push(span);
      lineWidth += spanWidth;
    }

    const lineHeight = lineBaseAscent + lineBaseDescent;

    lines.push({
      x: 0,
      y: lines.length > 0 ? lines[lines.length - 1].y + lines[lines.length - 1].height : 0,
      width: lineWidth,
      height: lineHeight,
      baseline: lineBaseAscent,
      ascent: lineBaseAscent,
      descent: lineBaseDescent,
      startIndex: charIndex - spans.reduce((s, sp) => s + sp.text.length, 0),
      endIndex: charIndex,
      spans,
    });
  }

  return lines;
}

// ── Bench function ────────────────────────────────────────────────────────

interface BenchResult {
  preset: string;
  spans: number;
  time: string;
  mem: string;
}

function benchPreset(
  name: string,
  lines: Line[],
  preset: SvgPreset,
  iterations: number,
): BenchResult {
  // Warmup: one render to JIT-compile
  renderToSVG(lines, { preset, sizing: 'content' });

  const totalSpans = lines.reduce((sum, l) => sum + l.spans.length, 0);

  // Force garbage collection hint (requires --expose-gc, works in bun)
  if (typeof (globalThis as any).gc === 'function') {
    (globalThis as any).gc();
  }

  const memBefore = (process as any).memoryUsage().heapUsed;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    renderToSVG(lines, { preset, sizing: 'content' });
  }

  const elapsed = performance.now() - start;
  const memAfter = (process as any).memoryUsage().heapUsed;

  const avgTime = elapsed / iterations;
  // Peak memory: max delta (smoothed, take the larger of immediate delta or 0)
  const memDelta = Math.max(0, memAfter - memBefore) / 1024 / 1024;

  return {
    preset: name,
    spans: totalSpans,
    time: avgTime.toFixed(3),
    mem: memDelta.toFixed(2),
  };
}

// ── Test sizes ─────────────────────────────────────────────────────────────

const PRESETS: Array<{ name: string; preset: SvgPreset }> = [
  { name: 'flat', preset: 'flat' },
  { name: 'browser', preset: 'browser' },
  { name: 'preserve', preset: 'preserve' },
  { name: 'glyph', preset: 'glyph' },
];

const SIZES: Array<{ label: string; spans: number; iterations: number }> = [
  { label: '100',      spans: 100,   iterations: 100 },
  { label: '1000',     spans: 1000,  iterations: 100 },
  { label: '10000',    spans: 10000, iterations: 30 },
  { label: '100000',   spans: 100000,iterations: 10 },
];

// ── Setup ──────────────────────────────────────────────────────────────────

let fuzzData: Map<string, Line[]> = new Map();

beforeAll(async () => {
  await registerUnifont();

  // Pre-generate fuzz data deterministically
  for (const size of SIZES) {
    const key = size.label;
    fuzzData.set(key, generateFuzzLines(size.spans, 42));
  }
});

// ── Test: validate fuzz output is valid SVG ───────────────────────────────

describe('SVG bench fuzz', () => {
  for (const { name, preset } of PRESETS) {
    for (const size of SIZES) {
      test(`fuzz ${name} ${size.spans}(i=${size.iterations})`, () => {
        const lines = fuzzData.get(size.label)!;
        const svg = renderToSVG(lines, { preset, sizing: 'content' });
        // Basic validation: must contain svg tag
        expect(svg).toContain('<svg');
        expect(svg).toContain('</svg>');
      });
    }
  }
});

// ── Bench: run all presets × sizes, print table ───────────────────────────

describe('SVG render bench table', () => {
  test('bench all presets', { timeout: 60000 }, () => {
    const results: BenchResult[] = [];

    for (const { name, preset } of PRESETS) {
      for (const size of SIZES) {
        const lines = fuzzData.get(size.label)!;
        const result = benchPreset(name, lines, preset, size.iterations);
        results.push(result);
      }
    }

    // Print formatted table
    console.log('┌──────────┬────────┬──────────┬───────────┐');
    console.log('│ Preset   │ Spans  │ Time(ms) │ Mem(MB)   │');
    console.log('├──────────┼────────┼──────────┼───────────┤');
    for (const r of results) {
      console.log(
        `│ ${r.preset.padEnd(8)} │ ${r.spans.toString().padEnd(6)} │ ${r.time.padEnd(8)} │ ${r.mem.padEnd(9)} │`,
      );
    }
    console.log('└──────────┴────────┴──────────┴───────────┘');

    // Also log as JSON for programmatic use
    console.log('Bench results JSON:', JSON.stringify(results, null, 2));

    // Ensure all results are valid
    expect(results.length).toBe(PRESETS.length * SIZES.length);
  });
});