/**
 * JSON editor panel — syntax-highlighted textarea.
 */
import { inputJson, inputStats, leftTab, setLeftTab } from '../stores/document';

export function JsonEditor(props: { onRun: () => void }) {
  return (
    <div class="flex flex-col flex-1 min-h-0">
      {/* Tabs */}
      <div class="flex bg-[#181825] border-b border-[#313244] shrink-0">
        <button
          classList={{ 'text-[#cba6f7] border-b-2 border-[#cba6f7]': leftTab() === 'input', 'text-[#6c7086]': leftTab() !== 'input' }}
          onClick={() => setLeftTab('input')}
          class="px-4 py-1.5 text-xs font-semibold cursor-pointer transition hover:text-[#cdd6f4] hover:bg-[#313244] bg-transparent border-b-2 border-transparent"
        >
          INPUT <span class="ml-1 font-normal text-[#6c7086] text-[11px]">{inputStats()}</span>
        </button>
        <button
          classList={{ 'text-[#cba6f7] border-b-2 border-[#cba6f7]': leftTab() === 'output', 'text-[#6c7086]': leftTab() !== 'output' }}
          onClick={() => setLeftTab('output')}
          class="px-4 py-1.5 text-xs font-semibold cursor-pointer transition hover:text-[#cdd6f4] hover:bg-[#313244] bg-transparent border-b-2 border-transparent"
        >
          OUTPUT <span class="ml-1 text-[#a6e3a1] text-[10px] font-normal">YAML</span>
        </button>
      </div>

      {/* Content */}
      <div class="flex-1 overflow-auto">
        {leftTab() === 'input' ? (
          <textarea
            value={inputJson()}
            onInput={e => { }}
            spellcheck={false}
            class="w-full h-full border-none resize-none p-3 font-mono text-xs leading-relaxed bg-[#1e1e2e] text-[#cdd6f4] outline-none"
          />
        ) : (
          <div class="w-full h-full p-3 font-mono text-xs leading-relaxed bg-[#1e1e2e] text-[#cdd6f4] whitespace-pre overflow-auto" />
        )}
      </div>
    </div>
  );
}