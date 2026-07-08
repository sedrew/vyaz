/**
 * Toolbar — page dimensions, render mode, debug controls.
 */
import { pageWidth, setPageWidth, pageHeight, setPageHeight, svgPreset, setSvgPreset, statusText, debugFlags, setDebugFlags } from '../stores/document';
import type { DebugFlags } from '../stores/document';
import { createSignal } from 'solid-js';

const DEBUG_ITEMS: { key: keyof DebugFlags; label: string }[] = [
  { key: 'box', label: '📦 Bounding box' },
  { key: 'baseline', label: '➖ Baseline' },
  { key: 'ascentDescent', label: '⋯ Ascent/Descent' },
  { key: 'frame', label: '📐 Text frame' },
  { key: 'labels', label: '📏 Labels' },
  { key: 'runs', label: '🟣 Run boxes' },
];

export function Toolbar(props: { onRun: () => void }) {
  const [debugOpen, setDebugOpen] = createSignal(false);
  const flags = debugFlags;
  const allChecked = () => DEBUG_ITEMS.every(item => flags()[item.key]);

  // Click outside to close dropdown
  function closeDebug() {
    setDebugOpen(false);
  }

  function toggleAll(checked: boolean) {
    const next = { ...flags() };
    for (const item of DEBUG_ITEMS) {
      next[item.key] = checked;
    }
    setDebugFlags(next);
  }

  function toggleOne(key: keyof DebugFlags) {
    setDebugFlags({ ...flags(), [key]: !flags()[key] });
  }

  return (
    <header class="flex items-center justify-between px-4 py-2 bg-[#181825] border-b border-[#313244] shrink-0">
      <div class="flex items-center gap-2">
        <h1 class="text-sm font-semibold text-[#cba6f7]">⏺ Pretext Inline</h1>
        <span class="text-xs text-[#6c7086]">Pure Frontend Demo</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-[#6c7086] bg-[#313244] rounded px-2 py-0.5">{statusText()}</span>

        <label class="text-xs text-[#cdd6f4] flex items-center gap-1">
          W: <input type="number" value={pageWidth()} min={100} max={2000} step={10}
            onInput={e => setPageWidth(Number(e.currentTarget.value))}
            class="w-12 px-1 py-0.5 rounded border border-[#585b70] bg-[#313244] text-[#cdd6f4] text-xs font-mono text-center outline-none focus:border-[#cba6f7]" />
        </label>
        <label class="text-xs text-[#cdd6f4] flex items-center gap-1">
          H: <input type="number" value={pageHeight()} min={100} max={2000} step={10}
            onInput={e => setPageHeight(Number(e.currentTarget.value))}
            class="w-12 px-1 py-0.5 rounded border border-[#585b70] bg-[#313244] text-[#cdd6f4] text-xs font-mono text-center outline-none focus:border-[#cba6f7]" />
        </label>

        <label class="text-xs text-[#cdd6f4] flex items-center gap-1">
          🖼 Preset:
          <select value={svgPreset()} onChange={e => setSvgPreset(e.currentTarget.value as any)}
            class="px-1 py-0.5 rounded border border-[#585b70] bg-[#313244] text-[#cdd6f4] text-xs outline-none cursor-pointer">
            <option value="flat">flat</option>
            <option value="browser">browser</option>
            <option value="preserve">preserve</option>
          </select>
        </label>

        {/* Debug dropdown */}
        <div class="relative">
          <button onClick={() => setDebugOpen(!debugOpen())}
            class="text-xs px-2 py-0.5 rounded border border-[#585b70] bg-transparent text-[#6c7086] cursor-pointer transition hover:bg-[#45475a] hover:text-[#cdd6f4]">
            🔲 Debug ▾
          </button>
          <div style={{ display: debugOpen() ? 'block' : 'none' }}>
            <div class="fixed inset-0 z-40" onClick={closeDebug} />
            <div class="absolute top-full left-0 mt-1 z-50 bg-[#313244] border border-[#45475a] rounded-md py-1 min-w-[170px] shadow-lg">
              {DEBUG_ITEMS.map(item => (
                <label class="flex items-center gap-1.5 px-3 py-1 text-xs text-[#cdd6f4] cursor-pointer hover:bg-[#45475a]">
                  <input type="checkbox" checked={flags()[item.key]}
                    onChange={() => toggleOne(item.key)}
                    class="accent-[#cba6f7] w-3 h-3" />
                  {item.label}
                </label>
              ))}
              <div class="h-px bg-[#45475a] mx-3 my-1" />
              <label class="flex items-center gap-1.5 px-3 py-1 text-xs text-[#cdd6f4] cursor-pointer hover:bg-[#45475a]">
                <input type="checkbox" checked={allChecked()}
                  onChange={e => toggleAll(e.currentTarget.checked)}
                  class="accent-[#cba6f7] w-3 h-3" />
                ✅ All / None
              </label>
            </div>
          </div>
        </div>

        <button onClick={props.onRun}
          class="bg-[#cba6f7] text-[#1e1e2e] border-none px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition hover:bg-[#b4befe]">
          ▶ Run Layout
        </button>
      </div>
    </header>
  );
}