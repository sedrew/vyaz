/**
 * Canvas rendering view.
 */
import { onMount, createEffect } from 'solid-js';
import { renderToCanvas } from '@vyaz/core';
import { lines, pageWidth, pageHeight, debugFlags, hasDebug } from '../stores/document';

export function CanvasView(props: { onRenderTime?: (ms: number) => void }) {
  let canvasRef: HTMLCanvasElement | undefined;

  createEffect(() => {
    const currentLines = lines();
    const pw = pageWidth();
    const ph = pageHeight();
    const flags = debugFlags();
    const showDebug = hasDebug();

    if (!canvasRef || currentLines.length === 0) return;

    const t0 = performance.now();
    const ctx = canvasRef.getContext('2d')!;
    canvasRef.width = pw;
    canvasRef.height = ph;

    const opts: Record<string, unknown> = { width: pw, height: ph, backgroundColor: '#ffffff' };
    if (showDebug) opts.debug = flags;
    renderToCanvas(ctx, currentLines, opts as any);
    props.onRenderTime?.(performance.now() - t0);
  });

  return (
    <div class="flex-1 flex justify-center items-start p-4 overflow-auto bg-white">
      <canvas ref={canvasRef} class="shadow-md" />
    </div>
  );
}