/**
 * blocks.test.ts — block text tags + document assembly (Phase 0 / 2).
 */
import { describe, test, expect } from 'bun:test';
import { convert, text } from './helpers.ts';

describe('block structure', () => {
  test('paragraphs become separate Paragraphs', () => {
    const { frame } = convert('<p>one</p><p>two</p>');
    expect(frame.paragraphs.map(text)).toEqual(['one', 'two']);
  });

  test('transparent containers are flattened', () => {
    const { frame } = convert('<div><section><p>deep</p></section></div>');
    expect(frame.paragraphs).toHaveLength(1);
    expect(text(frame.paragraphs[0])).toBe('deep');
  });

  test('bare text in a container still makes a paragraph', () => {
    const { frame } = convert('<div>loose text</div>');
    expect(text(frame.paragraphs[0])).toBe('loose text');
  });

  test('headings: scaled + bold + spacing', () => {
    const { frame } = convert('<h1>Big</h1><h3>Med</h3>', { baseFont: { size: 16 } });
    const h1 = frame.paragraphs[0];
    const h3 = frame.paragraphs[1];
    expect(h1.children[0].fontSize).toBe(32);
    expect(h1.children[0].fontWeight).toBe('bold');
    expect(h1.style.spaceBefore).toBeGreaterThan(0);
    expect(h3.children[0].fontSize).toBe(20);
  });

  test('blockquote indents + recolours, nested <p> inherits indent', () => {
    const { frame } = convert('<blockquote><p>quoted</p></blockquote>');
    const p = frame.paragraphs[0];
    expect(p.style.leftIndent).toBeGreaterThan(0);
    expect(p.children[0].color).toBe('#555555');
  });

  test('pre preserves whitespace + monospace', () => {
    const { frame } = convert('<pre>  a\n  b</pre>');
    const p = frame.paragraphs[0];
    expect(p.style.whiteSpace).toBe('pre');
    expect(p.children[0].fontFamily).toBe('monospace');
    expect(text(p)).toBe('  a\n  b');
  });

  test('whitespace collapses outside pre', () => {
    expect(text(convert('<p>a\n   b\t c</p>').frame.paragraphs[0])).toBe('a b c');
  });

  test('br → newline within one paragraph', () => {
    const { frame } = convert('<p>a<br>b</p>');
    expect(frame.paragraphs).toHaveLength(1);
    expect(text(frame.paragraphs[0])).toBe('a\nb');
  });

  test('adjacent same-style runs merge', () => {
    const { frame } = convert('<p>a<span>b</span>c</p>');
    expect(frame.paragraphs[0].children).toHaveLength(1);
  });

  test('address → italic', () => {
    expect(convert('<address>me</address>').frame.paragraphs[0].children[0].fontStyle).toBe('italic');
  });
});

describe('frame assembly', () => {
  test('width + defaultStyle from options', () => {
    const { frame } = convert('<p>x</p>', { width: 640, baseFont: { family: 'Inter', size: 18 } });
    expect(frame.width).toBe(640);
    expect(frame.wrap).toBe(true);
    expect(frame.defaultStyle!.fontFamily).toBe('Inter');
    expect(frame.defaultStyle!.fontSize).toBe(18);
  });

  test('no width option → auto (width omitted)', () => {
    expect('width' in convert('<p>x</p>').frame).toBe(false);
  });

  test('empty / whitespace-only input → no paragraphs', () => {
    expect(convert('   \n  ').frame.paragraphs).toHaveLength(0);
  });
});

describe('dropped + warnings', () => {
  // <table> itself converts now — see tables.test.ts.

  test('media + form controls dropped', () => {
    const { dropped } = convert('<video src="x"></video><input><button>go</button>');
    expect(dropped.map((d) => d.tag).sort()).toEqual(['button', 'input', 'video']);
  });

  test('onUnsupported:"throw" for an unknown tag', () => {
    expect(() => convert('<weird>x</weird>', { onUnsupported: 'throw' })).toThrow(/weird/);
  });

  test('unknown tag defaults to drop', () => {
    const { dropped } = convert('<weird>x</weird>');
    expect(dropped[0].tag).toBe('weird');
  });
});
