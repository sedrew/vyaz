/**
 * Global document store — SolidJS signals for the demo.
 */
import { createSignal, createMemo } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { LineBox, Paragraph } from '@vyaz/core';
import type { SvgPreset } from '@vyaz/core';
import { layoutDocument } from '../utils/layout';

export interface DebugFlags {
  box: boolean;
  baseline: boolean;
  ascentDescent: boolean;
  frame: boolean;
  labels: boolean;
  runs: boolean;
}

export const DEFAULT_DEBUG: DebugFlags = {
  box: true,
  baseline: true,
  ascentDescent: true,
  frame: true,
  labels: true,
  runs: true,
};

export interface BenchmarkTimes {
  measure: number;
  canvas: number;
  svg: number;
}

// ── Signals ───────────────────────────────────────────────────────────

export const [inputJson, setInputJson] = createSignal<string>('');
export const [doc, setDoc] = createSignal<{ paragraphs: Paragraph[]; config?: Record<string, unknown> } | null>(null);
export const [lines, setLines] = createSignal<LineBox[]>([]);
export const [debugFlags, setDebugFlags] = createSignal<DebugFlags>({ ...DEFAULT_DEBUG });
export const [pageWidth, setPageWidth] = createSignal(612);
export const [pageHeight, setPageHeight] = createSignal(792);
export const [svgPreset, setSvgPreset] = createSignal<SvgPreset>('preserve');
export const [statusText, setStatusText] = createSignal<string>('ready');
export const [benchmark, setBenchmark] = createSignal<BenchmarkTimes>({ measure: 0, canvas: 0, svg: 0 });
export const [leftTab, setLeftTab] = createSignal<'input' | 'output'>('input');
export const [svgTab, setSvgTab] = createSignal<'preview' | 'source'>('preview');

// ── Memos ─────────────────────────────────────────────────────────────

export const inputStats = createMemo(() => {
  const json = inputJson();
  if (!json) return '—';
  try {
    const data = JSON.parse(json);
    const paragraphs = data.paragraphs || [];
    let chars = 0;
    for (const p of paragraphs) {
      const children = p.children || [];
      for (const r of children) chars += (r.text || '').length;
    }
    return `${paragraphs.length}p, ${chars}c`;
  } catch {
    return '⚠ invalid JSON';
  }
});

export const hasDebug = createMemo(() => {
  const f = debugFlags();
  return f.box || f.baseline || f.ascentDescent || f.frame || f.labels || f.runs;
});

// ── Actions ───────────────────────────────────────────────────────────

export function runLayout(json: string): void {
  setStatusText('running…');
  try {
    const data = JSON.parse(json);
    if (!data.paragraphs || !Array.isArray(data.paragraphs)) throw new Error('Missing "paragraphs" array');

    const cfg = data.config || {};
    const pw = parseFloat(cfg.pageWidth) || 612;
    const ph = parseFloat(cfg.pageHeight) || 792;
    setPageWidth(pw);
    setPageHeight(ph);

    const t0 = performance.now();
    const result = layoutDocument(data);
    const t1 = performance.now();

    setDoc(data);
    setLines(result);
    setBenchmark({ measure: t1 - t0, canvas: 0, svg: 0 });
    setStatusText(`done — ${result.length} lines`);
  } catch (err) {
    setStatusText('error');
    setDoc(null);
    setLines([]);
    throw err;
  }
}