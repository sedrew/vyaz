/**
 * lists.test.ts — ul / ol / li → listStyle, nesting via level (Phase 3).
 */
import { describe, test, expect } from 'bun:test';
import { convert, text } from './helpers.ts';

describe('lists', () => {
  test('ul → bullet list, one Paragraph per li', () => {
    const { frame } = convert('<ul><li>a</li><li>b</li><li>c</li></ul>');
    expect(frame.paragraphs).toHaveLength(3);
    for (const p of frame.paragraphs) {
      expect(p.style.listStyle).toEqual({ type: 'bullet', level: 0 });
    }
    expect(frame.paragraphs.map(text)).toEqual(['a', 'b', 'c']);
  });

  test('ol → numbered list', () => {
    const { frame } = convert('<ol><li>one</li><li>two</li></ol>');
    expect(frame.paragraphs.every((p) => p.style.listStyle!.type === 'number')).toBe(true);
  });

  test('ol start="5" sets startNumber on the items', () => {
    const { frame } = convert('<ol start="5"><li>e</li><li>f</li></ol>');
    expect(frame.paragraphs[0].style.listStyle!.startNumber).toBe(5);
    expect(frame.paragraphs[1].style.listStyle!.startNumber).toBe(6);
  });

  test('nested list → level + 1, with a warning', () => {
    const { frame, warnings } = convert(
      '<ul><li>top<ul><li>child</li></ul></li><li>top2</li></ul>',
    );
    const levels = frame.paragraphs.map((p) => p.style.listStyle!.level);
    expect(levels).toEqual([0, 1, 0]);
    expect(text(frame.paragraphs[1])).toBe('child');
    expect(warnings.some((w) => w.code === 'nested-list')).toBe(true);
  });

  test('inline formatting inside li is kept', () => {
    const { frame } = convert('<ul><li>plain <strong>bold</strong></li></ul>');
    const p = frame.paragraphs[0];
    expect(p.style.listStyle!.type).toBe('bullet');
    expect(p.children.find((r) => r.text === 'bold')!.fontWeight).toBe('bold');
  });

  test('li with a block child is flattened into the item line', () => {
    const { frame } = convert('<ul><li><p>wrapped</p></li></ul>');
    expect(frame.paragraphs).toHaveLength(1);
    expect(text(frame.paragraphs[0])).toBe('wrapped');
    expect(frame.paragraphs[0].style.listStyle!.type).toBe('bullet');
  });

  test('list survives the full layout pipeline', () => {
    const { frame } = convert('<ol><li>alpha</li><li>beta</li></ol>');
    // markers are resolved by the engine, not the converter
    expect(frame.paragraphs[0].style.listStyle).toBeDefined();
  });

  test('dl → bold term + indented definition', () => {
    const { frame } = convert('<dl><dt>Term</dt><dd>Definition</dd></dl>');
    expect(frame.paragraphs[0].children[0].fontWeight).toBe('bold');
    expect(frame.paragraphs[1].style.leftIndent).toBeGreaterThan(0);
  });
});
