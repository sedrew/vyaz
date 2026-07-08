/**
 * App — main layout for the Rich Text Demo.
 * Combines editor input, canvas output, SVG preview, and benchmark.
 */
import { Toolbar } from './components/Toolbar';
import { CanvasView } from './components/CanvasView';
import { SvgView } from './components/SvgView';
import { Benchmark } from './components/Benchmark';
import { setInputJson, inputJson, runLayout, setBenchmark, pageWidth, pageHeight } from './stores/document';
import { onMount } from 'solid-js';

export function App() {
  let inputRef: HTMLTextAreaElement | undefined;

  // Load input.json
  onMount(async () => {
    try {
      const res = await fetch('/src/input.json');
      const data = await res.json();
      const json = JSON.stringify(data, null, 2);
      setInputJson(json);
      if (inputRef) { inputRef.value = json; }
      runLayout(json);
    } catch {
      const fallback = {
        config: { pageWidth: 612, pageHeight: 792, margins: { top: 72, right: 72, bottom: 72, left: 72 } },
        paragraphs: [{
          type: 'paragraph',
          style: { alignment: 'left', lineHeight: 1.15, spaceBefore: 0, spaceAfter: 0 },
          children: [{ type: 'text', text: 'Error: could not load input.json', style: { fontFamily: 'Arial', fontSize: 14, fontWeight: 400, fontStyle: 'normal', color: '#f38ba8' } }],
        }],
      };
      const json = JSON.stringify(fallback, null, 2);
      setInputJson(json);
      if (inputRef) { inputRef.value = json; }
      runLayout(json);
    }
  });

  function handleRun() {
    const json = inputRef?.value || inputJson();
    setInputJson(json);
    try {
      runLayout(json);
    } catch (err) {
      console.error(err);
    }
  }

  function handleInput() {
    if (inputRef) {
      setInputJson(inputRef.value);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
    }
  }

  function setCanvasTime(ms: number) {
    setBenchmark((prev: any) => ({ ...prev, canvas: ms }));
  }

  function setSvgTime(ms: number) {
    setBenchmark((prev: any) => ({ ...prev, svg: ms }));
  }

  return (
    <div class="h-screen flex flex-col bg-[#1e1e2e] text-[#cdd6f4]">
      <Toolbar onRun={handleRun} />

      <div class="flex-1 flex min-h-0">
        {/* LEFT PANEL */}
        <div class="w-1/2 flex flex-col border-r border-[#313244] min-w-0">
          <div class="flex flex-col flex-1 min-h-0">
            <div class="flex bg-[#181825] border-b border-[#313244] shrink-0">
              <button class="active-tab px-4 py-1.5 text-xs font-semibold text-[#cba6f7] border-b-2 border-[#cba6f7] bg-transparent cursor-pointer">
                INPUT <span class="ml-1 font-normal text-[#6c7086] text-[11px]" id="inputStats" />
              </button>
            </div>
            <textarea
              ref={inputRef}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              spellcheck={false}
              class="flex-1 border-none resize-none p-3 font-mono text-xs leading-relaxed bg-[#1e1e2e] text-[#cdd6f4] outline-none"
            />
          </div>

          <div class="flex flex-col flex-1 min-h-0 border-t border-[#313244]">
            <div class="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-[#181825] border-b border-[#313244] shrink-0">
              <span class="inline-block w-1.5 h-1.5 rounded-full bg-[#f9e2af]" />
              BENCHMARK — render times
            </div>
            <Benchmark />
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div class="flex-1 flex flex-col min-w-0">
          <div class="flex flex-col flex-1 min-h-0">
            <div class="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-[#181825] border-b border-[#313244] shrink-0">
              <span class="inline-block w-1.5 h-1.5 rounded-full bg-[#a6e3a1]" />
              CANVAS — rendered text
              <span class="ml-auto font-normal text-[#6c7086] text-[11px]">{pageWidth()}×{pageHeight()}</span>
            </div>
            <CanvasView onRenderTime={setCanvasTime} />
          </div>
          <div class="flex flex-col flex-1 min-h-0 border-t border-[#313244]">
            <SvgView onRenderTime={setSvgTime} />
          </div>
        </div>
      </div>
    </div>
  );
}