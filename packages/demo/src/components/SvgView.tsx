/**
 * SVG preview + source tabs.
 */
import { createEffect } from 'solid-js';
import { renderToSVG } from '@vyaz/core';
import { lines, pageWidth, pageHeight, svgPreset, debugFlags, hasDebug, svgTab, setSvgTab } from '../stores/document';

export function SvgView(props: { onRenderTime?: (ms: number) => void }) {
  let previewRef: HTMLDivElement | undefined;

  createEffect(() => {
    const currentLines = lines();
    const pw = pageWidth();
    const ph = pageHeight();
    const preset = svgPreset();
    const flags = debugFlags();
    const showDebug = hasDebug();

    if (currentLines.length === 0) return;

    const t0 = performance.now();
    const opts: Record<string, unknown> = { width: pw, height: ph, preset };
    if (showDebug) opts.debug = flags;
    const svg = renderToSVG(currentLines, opts as any);
    props.onRenderTime?.(performance.now() - t0);

    if (previewRef) previewRef.innerHTML = svg;
  });

  return (
    <div class="flex flex-col flex-1 min-h-0">
      <div class="flex bg-[#181825] border-b border-[#313244] shrink-0">
        <button
          classList={{ 'text-[#cba6f7] border-b-2 border-[#cba6f7]': svgTab() === 'preview', 'text-[#6c7086]': svgTab() !== 'preview' }}
          onClick={() => setSvgTab('preview')}
          class="px-4 py-1.5 text-xs font-semibold cursor-pointer transition hover:text-[#cdd6f4] hover:bg-[#313244] bg-transparent border-b-2 border-transparent"
        >
          PREVIEW
        </button>
        <button
          classList={{ 'text-[#cba6f7] border-b-2 border-[#cba6f7]': svgTab() === 'source', 'text-[#6c7086]': svgTab() !== 'source' }}
          onClick={() => setSvgTab('source')}
          class="px-4 py-1.5 text-xs font-semibold cursor-pointer transition hover:text-[#cdd6f4] hover:bg-[#313244] bg-transparent border-b-2 border-transparent"
        >
          SOURCE
        </button>
      </div>

      <div class="flex-1 overflow-auto">
        {svgTab() === 'preview' ? (
          <div ref={previewRef} class="flex justify-center items-start p-4 overflow-auto bg-white" />
        ) : (
          <textarea readonly spellcheck={false}
            class="w-full h-full border-none resize-none p-3 font-mono text-xs leading-relaxed bg-[#1e1e2e] text-[#cdd6f4] outline-none" />
        )}
      </div>
    </div>
  );
}