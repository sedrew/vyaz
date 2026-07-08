/**
 * Benchmark table — render times display.
 */
import { benchmark } from '../stores/document';

function benchClass(ms: number): string {
  if (ms < 2) return 'val-fast';
  if (ms < 5) return 'val-med';
  return 'val-slow';
}

export function Benchmark() {
  const bm = benchmark;
  return (
    <div class="flex-1 overflow-auto p-2 font-mono text-[11px]">
      {bm().measure === 0 && bm().canvas === 0 && bm().svg === 0 ? (
        <div class="text-[#6c7086] text-center py-4 text-xs">▶ Run Layout to measure</div>
      ) : (
        <table class="w-full border-collapse">
          <thead>
            <tr>
              <th class="px-2 py-1 text-right text-[#6c7086] font-semibold text-center">Phase</th>
              <th class="px-2 py-1 text-right text-[#6c7086] font-semibold">Time (ms)</th>
            </tr>
          </thead>
          <tbody>
            {(['measure', 'canvas', 'svg'] as const).map(key => (
              <tr>
                <td class="px-2 py-1 text-left text-[#a6adc8] border-b border-[#313244]">
                  {key === 'measure' ? 'Measure (layout)' : key === 'canvas' ? 'Canvas render' : 'SVG render'}
                </td>
                <td class={`px-2 py-1 text-right border-b border-[#313244] ${benchClass(bm()[key])}`}>
                  {bm()[key].toFixed(2)}
                </td>
              </tr>
            ))}
            <tr style="border-top: 1px solid #585b70">
              <td class="px-2 py-1 text-left text-[#a6adc8] font-bold border-b border-[#313244]">Total</td>
              <td class={`px-2 py-1 text-right font-bold border-b border-[#313244] ${benchClass(bm().measure + bm().canvas + bm().svg)}`}>
                {(bm().measure + bm().canvas + bm().svg).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}