/**
 * sourceIndex.ts — map laid-out spans back to the paragraph's source text.
 *
 * Span text is what was laid out: collapsible whitespace squeezed to one space
 * (or dropped at a line edge) unless the paragraph preserves spaces. Each span
 * gets the `[startIndex, endIndex)` it covers in the source; lines then tile
 * the source — a line ends where the next one starts, so whitespace swallowed
 * at a wrap belongs to the line before it (as PowerPoint numbers its lines).
 */
import type { Line } from '../types/LayoutTypes.js';

const WS = /[ \t\n\r\f]/;

/**
 * @param lines — the lines of one line-break-free piece of a paragraph
 * @param sourceTexts — source text per run (indexed by `Span.itemIndex`)
 * @param base — offset of the piece in the paragraph's source text
 * @param collapse — whitespace was collapsed (`white-space` other than `pre` / `pre-wrap`)
 * @param endsWithBreak — a `\n` follows the piece; it is counted into its last line
 */
export function assignSourceIndices(
  lines: Line[],
  sourceTexts: string[],
  base: number,
  collapse: boolean,
  endsWithBreak: boolean,
): void {
  const runStart: number[] = [];
  let total = 0;
  for (const t of sourceTexts) { runStart.push(total); total += t.length; }
  const cursor = new Array<number>(sourceTexts.length).fill(0);

  for (const line of lines) {
    for (const span of line.spans) {
      if (span.type === 'marker') continue;
      const i = span.itemIndex;
      const src = sourceTexts[i];
      if (src === undefined) continue;
      let q = cursor[i];
      let start = q;
      if (span.text.length > 0) {
        if (span.type === 'space') {
          if (collapse) while (q < src.length && WS.test(src[q])) q++;
          else q = Math.min(src.length, q + span.text.length);
        } else {
          // whitespace dropped before the span (line start, item boundary)
          if (collapse && !WS.test(span.text[0])) while (q < src.length && WS.test(src[q])) q++;
          start = q;
          for (let k = 0; k < span.text.length && q < src.length; k++) {
            if (collapse && WS.test(span.text[k]) && WS.test(src[q])) {
              while (q < src.length && WS.test(src[q])) q++;
            } else {
              q++;
            }
          }
        }
      }
      cursor[i] = q;
      span.startIndex = base + runStart[i] + start;
      span.endIndex = base + runStart[i] + q;
    }
  }

  const firstStart = (line: Line): number | undefined => {
    let min: number | undefined;
    for (const s of line.spans) {
      if (s.type === 'marker' || s.startIndex === undefined) continue;
      if (min === undefined || s.startIndex < min) min = s.startIndex;
    }
    return min;
  };
  const lastEnd = (line: Line): number | undefined => {
    let max: number | undefined;
    for (const s of line.spans) {
      if (s.type === 'marker' || s.endIndex === undefined) continue;
      if (max === undefined || s.endIndex > max) max = s.endIndex;
    }
    return max;
  };

  let prevEnd = base;
  for (let k = 0; k < lines.length; k++) {
    const line = lines[k];
    line.startIndex = prevEnd;
    const next = k + 1 < lines.length ? firstStart(lines[k + 1]) : base + total;
    line.endIndex = Math.max(prevEnd, next ?? lastEnd(line) ?? prevEnd);
    prevEnd = line.endIndex;
  }
  if (endsWithBreak && lines.length > 0) lines[lines.length - 1].endIndex += 1;
}
