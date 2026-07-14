/**
 * group-lines-by-paragraph.test.ts — Tests for groupLinesByParagraph utility.
 */

import { describe, test, expect } from 'bun:test';
import { groupLinesByParagraph } from '../src/utils/groupLinesByParagraph.js';
import type { Line, Span } from '../src/types/LayoutTypes.js';

function makeSpan(text: string, pIdx: number, tag?: string): Span {
  return {
    x: 0,
    width: text.length * 10,
    text,
    itemIndex: 0,
    pIdx,
    tag,
    fontMetrics: { ascent: 10, descent: 3, fontSize: 12 },
    style: {
      type: 'text',
      text,
      fontFamily: 'Arial',
      fontSize: 12,
      fontWeight: 'normal',
      fontStyle: 'normal',
      color: '#000',
    },
    type: 'text',
  };
}

function makeLine(y: number, pIdx: number, tag?: string, text = 'Hello'): Line {
  return {
    x: 0,
    y,
    width: 50,
    height: 14,
    baseline: 11,
    ascent: 10,
    descent: 3,
    startIndex: 0,
    endIndex: text.length,
    spans: [makeSpan(text, pIdx, tag)],
  };
}

describe('groupLinesByParagraph', () => {
  test('empty lines → empty array', () => {
    expect(groupLinesByParagraph([])).toEqual([]);
  });

  test('single paragraph → one group', () => {
    const lines = [makeLine(0, 0)];
    const groups = groupLinesByParagraph(lines);
    expect(groups).toHaveLength(1);
    expect(groups[0].pIdx).toBe(0);
    expect(groups[0].tag).toBeUndefined();
    expect(groups[0].lines).toEqual(lines);
  });

  test('two paragraphs with different pIdx → two groups', () => {
    const lines = [
      makeLine(0, 0, 'p1', 'First'),
      makeLine(14, 0, 'p1', 'First'),
      makeLine(28, 1, 'p2', 'Second'),
    ];
    const groups = groupLinesByParagraph(lines);
    expect(groups).toHaveLength(2);
    expect(groups[0].pIdx).toBe(0);
    expect(groups[0].tag).toBe('p1');
    expect(groups[0].lines).toHaveLength(2);
    expect(groups[1].pIdx).toBe(1);
    expect(groups[1].tag).toBe('p2');
    expect(groups[1].lines).toHaveLength(1);
  });

  test('three paragraphs → three groups with correct bbox', () => {
    const lines = [
      makeLine(0, 0, 'a', 'Line1'),
      makeLine(20, 1, 'b', 'Line2'),
      makeLine(40, 2, 'c', 'Line3'),
    ];
    const groups = groupLinesByParagraph(lines);
    expect(groups).toHaveLength(3);
    expect(groups[0].pIdx).toBe(0);
    expect(groups[1].pIdx).toBe(1);
    expect(groups[2].pIdx).toBe(2);
  });

  test('tag is taken from first span of first line', () => {
    const lines = [
      makeLine(0, 5, 'my-para'),
      makeLine(14, 5, 'my-para'),
    ];
    const groups = groupLinesByParagraph(lines);
    expect(groups).toHaveLength(1);
    expect(groups[0].pIdx).toBe(5);
    expect(groups[0].tag).toBe('my-para');
  });
});