/**
 * rule-lines.test.ts — SVG painting for Line.rule (<hr>) and Line.leftRule
 * (<blockquote>'s vertical bar). See Document.ts's Paragraph.rule /
 * ParagraphStyle.leftRule doc comments for the input side.
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { registerUnifont } from './helpers.ts';
import { renderFrameToSVG } from './helpers.ts';
import type { TextFrame } from '../../core/src/types/Document.js';

beforeAll(async () => {
  await registerUnifont();
});

describe('Line.rule → horizontal <hr> bar', () => {
  test('paints one full-width <line> at the rule\'s vertical center', () => {
    const frame: TextFrame = {
      width: 300,
      wrap: true,
      paragraphs: [
        { style: { alignment: 'left', lineHeight: 1, spaceBefore: 0, spaceAfter: 0 }, children: [], rule: { thickness: 2, color: '#abcdef' } },
      ],
    };
    const { result, svg } = renderFrameToSVG(frame);
    const line = result.lines[0];
    expect(svg).toContain(`x1="${line.x}"`);
    expect(svg).toContain(`x2="${line.x + line.width}"`);
    expect(svg).toContain('stroke="#abcdef"');
    expect(svg).toContain('stroke-width="2"');
  });

  test('no spans → no <text> painted for the rule paragraph', () => {
    const frame: TextFrame = {
      width: 300,
      wrap: true,
      paragraphs: [
        { style: { alignment: 'left', lineHeight: 1, spaceBefore: 0, spaceAfter: 0 }, children: [], rule: { thickness: 1, color: '#000' } },
      ],
    };
    const { svg } = renderFrameToSVG(frame);
    expect(svg).not.toContain('<text');
  });
});

describe('Line.leftRule → blockquote-style vertical bar', () => {
  test('paints one vertical <line> per wrapped line, same x, spanning that line\'s y range', () => {
    const frame: TextFrame = {
      width: 100,
      wrap: true,
      paragraphs: [
        {
          style: { alignment: 'left', lineHeight: 1.2, spaceBefore: 0, spaceAfter: 0, leftRule: { width: 3, color: '#ddd' } },
          children: [{ type: 'text', text: 'one two three four five six seven eight', fontFamily: 'Unifont', fontSize: 14, fontWeight: 'normal', fontStyle: 'normal', color: '#000' }],
        },
      ],
    };
    const { result, svg } = renderFrameToSVG(frame);
    expect(result.lines.length).toBeGreaterThan(1);
    const verticalLines = [...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)" stroke="#ddd" stroke-width="3"/g)];
    expect(verticalLines).toHaveLength(result.lines.length);
    for (const [, x1, y1, x2] of verticalLines) {
      expect(x1).toBe(x2); // vertical: same x at both ends
    }
    const xs = new Set(verticalLines.map((m) => m[1]));
    expect(xs.size).toBe(1); // every segment at the same x
  });

  test('a plain paragraph paints no leftRule <line>', () => {
    const frame: TextFrame = {
      width: 300,
      wrap: true,
      paragraphs: [
        { style: { alignment: 'left', lineHeight: 1.2, spaceBefore: 0, spaceAfter: 0 }, children: [{ type: 'text', text: 'plain', fontFamily: 'Unifont', fontSize: 14, fontWeight: 'normal', fontStyle: 'normal', color: '#000' }] },
      ],
    };
    const { svg } = renderFrameToSVG(frame);
    expect(svg).not.toContain('stroke-width="3"');
  });
});
