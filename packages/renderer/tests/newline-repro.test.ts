/**
 * newline-repro.ts — проверяем, как `\n` отражается для разных whiteSpace режимов.
 *
 * Запуск: bun run packages/renderer/tests/newline-repro.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { splitParagraphByHardBreaks } from '../../core/src/compile/DocumentCompiler.js';
import { fontMetricsProvider, layoutTextFrame } from '@vyaz/core';
import type { Paragraph, TextFrame, TextRun, TextAlignment } from '@vyaz/core';
import { renderToSVG } from '../src/SVGRenderer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const fontPath = resolve(__dirname, '../../core/tests/fixtures/unifont-17.0.05.otf');
  const data = readFileSync(fontPath);
  await fontMetricsProvider.registerFont('Unifont', { weight: 'normal', style: 'normal' }, data);
  await fontMetricsProvider.registerFont('Unifont', { weight: 'bold', style: 'normal' }, data);
  await fontMetricsProvider.registerFont('Unifont', { weight: 'normal', style: 'italic' }, data);
  await fontMetricsProvider.registerFont('Unifont', { weight: 'bold', style: 'italic' }, data);

  type WhiteSpaceMode = 'normal' | 'pre' | 'pre-wrap' | 'pre-line' | 'nowrap';

  const testCases: {
    name: string;
    text: string;
    whiteSpace: WhiteSpaceMode;
    multiRun?: boolean;
  }[] = [
    { name: 'inline-newline-normal', text: 'Hello\nWorld', whiteSpace: 'normal' },
    { name: 'inline-newline-pre', text: 'Hello\nWorld', whiteSpace: 'pre' },
    { name: 'inline-newline-pre-wrap', text: 'Hello\nWorld', whiteSpace: 'pre-wrap' },
    { name: 'inline-newline-pre-line', text: 'Hello\nWorld', whiteSpace: 'pre-line' },
    { name: 'multi-run-newline', text: 'Hello\nWorld', whiteSpace: 'normal', multiRun: true },
    { name: 'only-newline', text: '\n', whiteSpace: 'pre' },
    { name: 'only-newline-pre-line', text: '\n', whiteSpace: 'pre-line' },
    { name: 'only-newline-normal', text: '\n', whiteSpace: 'normal' },
    { name: 'double-newline', text: 'Hello\n\nWorld', whiteSpace: 'normal' },
    { name: 'double-newline-pre-line', text: 'Hello\n\nWorld', whiteSpace: 'pre-line' },
    { name: 'leading-newline-pre-line', text: '\nHello', whiteSpace: 'pre-line' },
    { name: 'trailing-newline-pre-line', text: 'Hello\n', whiteSpace: 'pre-line' },
    { name: 'collapse-newline-pre-line', text: '  Hello   \n\n   World  ', whiteSpace: 'pre-line' },
    { name: 'spaced-newline-pre-line', text: 'Hello   World\nFoo   Bar', whiteSpace: 'pre-line' },
    { name: 'cross-run-newline', text: 'Hello Bold\nWorld', whiteSpace: 'normal', multiRun: true },
  ];

  for (const tc of testCases) {
    console.log(`\n=== ${tc.name} ===`);

    let paragraph: Paragraph;

    if (tc.multiRun) {
      if (tc.name === 'multi-run-newline') {
        paragraph = {
          children: [
            { text: 'Hello', type: 'text', fontFamily: 'Unifont', fontSize: 12, fontWeight: 400, fontStyle: 'normal', color: '#000000' } as TextRun,
            { text: '\n', type: 'text', fontFamily: 'Unifont', fontSize: 12, fontWeight: 400, fontStyle: 'normal', color: '#000000' } as TextRun,
            { text: 'World', type: 'text', fontFamily: 'Unifont', fontSize: 12, fontWeight: 400, fontStyle: 'normal', color: '#000000' } as TextRun,
          ],
          style: { alignment: 'left' as TextAlignment, lineHeight: 1.15, spaceBefore: 0, spaceAfter: 0, whiteSpace: tc.whiteSpace as any },
        };
      } else {
        paragraph = {
          children: [
            { text: 'Hello ', type: 'text', fontFamily: 'Unifont', fontSize: 12, fontWeight: 400, fontStyle: 'normal', color: '#000000' } as TextRun,
            { text: 'Bold', type: 'text', fontFamily: 'Unifont', fontSize: 12, fontWeight: 'bold', fontStyle: 'normal', color: '#000000' } as TextRun,
            { text: '\n', type: 'text', fontFamily: 'Unifont', fontSize: 12, fontWeight: 'bold', fontStyle: 'normal', color: '#000000' } as TextRun,
            { text: 'World', type: 'text', fontFamily: 'Unifont', fontSize: 12, fontWeight: 400, fontStyle: 'normal', color: '#000000' } as TextRun,
          ],
          style: { alignment: 'left' as TextAlignment, lineHeight: 1.15, spaceBefore: 0, spaceAfter: 0, whiteSpace: tc.whiteSpace as any },
        };
      }
    } else {
      paragraph = {
        children: [{
          text: tc.text, type: 'text' as const,
          fontFamily: 'Unifont', fontSize: 12, fontWeight: 400,
          fontStyle: 'normal' as const, color: '#000000',
        } as TextRun],
        style: { alignment: 'left' as TextAlignment, lineHeight: 1.15, spaceBefore: 0, spaceAfter: 0, whiteSpace: tc.whiteSpace as any },
      };
    }

    // Debug: show sub-paragraphs after zero phase
    const subParagraphs = splitParagraphByHardBreaks(paragraph);
    console.log(`Sub-paragraphs: ${subParagraphs.length}`);
    for (let s = 0; s < subParagraphs.length; s++) {
      const sub = subParagraphs[s];
      const texts = sub.children.length === 0 
        ? '(empty — hard-break)' 
        : sub.children.map(r => JSON.stringify(r.text)).join(' + ');
      console.log(`  Sub ${s}: ${texts}`);
    }

    const frame: TextFrame = { width: 200, wrap: true, paragraphs: [paragraph] };
    const result = layoutTextFrame(frame);

    console.log(`Lines: ${result.lines.length}`);
    for (let i = 0; i < result.lines.length; i++) {
      const line = result.lines[i];
      const spansInfo = line.spans.map(s => `${JSON.stringify(s.text)}(${s.type})`).join(', ');
      const hb = line.isHardBreak ? ' [HARD-BREAK]' : '';
      const bt = line.spans.length > 0 && line.spans[line.spans.length - 1].breakType === 'hard' ? ' [HARD]' : '';
      console.log(`  Line ${i}: y=${line.y} h=${line.height} baseline=${line.baseline}${hb}${bt} start=${line.startIndex} end=${line.endIndex} [${spansInfo}]`);
    }

    const svg = renderToSVG(result.lines, {
      preset: 'preserve',
      sizing: 'content',
      contentPadding: 10,
      debug: { frameBox: true, contentBox: true },
    });
    const outPath = resolve(__dirname, 'snapshots', `newline-${tc.name}.svg`);
    writeFileSync(outPath, svg, 'utf-8');
    console.log(`SVG written to ${outPath}`);
  }
}

main().catch(console.error);