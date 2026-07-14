/**
 * html-to-text-frame.test.ts — Tests for htmlToTextFrame.
 */

import { describe, test, expect } from 'bun:test';
import { htmlToTextFrame } from '../htmlToTextFrame.js';
import type { TextFrame, Paragraph, TextRun } from '@vyaz/core';

// ── Helpers ─────────────────────────────────────────────────────────────

function firstRun(p: Paragraph): TextRun {
  return p.children[0];
}

function lastRun(p: Paragraph): TextRun {
  return p.children[p.children.length - 1];
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('htmlToTextFrame', () => {
  test('parses simple plain text', () => {
    const frame = htmlToTextFrame('Hello');
    expect(frame.paragraphs).toHaveLength(1);
    expect(frame.paragraphs[0].children[0].text).toBe('Hello');
  });

  test('parses <p> tag', () => {
    const frame = htmlToTextFrame('<p>Hello world</p>');
    expect(frame.paragraphs).toHaveLength(1);
    expect(frame.paragraphs[0].children[0].text).toBe('Hello world');
  });

  test('creates separate paragraphs for multiple <p> tags', () => {
    const frame = htmlToTextFrame('<p>First</p><p>Second</p>');
    expect(frame.paragraphs).toHaveLength(2);
    expect(frame.paragraphs[0].children[0].text).toBe('First');
    expect(frame.paragraphs[1].children[0].text).toBe('Second');
  });

  test('parses <b> and <strong> as bold', () => {
    const frame = htmlToTextFrame('<p><b>bold</b> and <strong>strong</strong></p>');
    const runs = frame.paragraphs[0].children;
    expect(runs).toHaveLength(3);
    expect(runs[0].text).toBe('bold');
    expect(runs[0].fontWeight).toBe('bold');
    expect(runs[2].text).toBe('strong');
    expect(runs[2].fontWeight).toBe('bold');
  });

  test('parses <i> and <em> as italic', () => {
    const frame = htmlToTextFrame('<p><i>italic</i> and <em>emphasis</em></p>');
    const runs = frame.paragraphs[0].children;
    expect(runs[0].fontStyle).toBe('italic');
    expect(runs[2].fontStyle).toBe('italic');
  });

  test('parses <u> as underline', () => {
    const frame = htmlToTextFrame('<p><u>underlined</u></p>');
    expect(frame.paragraphs[0].children[0].underline).toBe(true);
  });

  test('parses <s> as strikethrough', () => {
    const frame = htmlToTextFrame('<p><s>struck</s></p>');
    expect(frame.paragraphs[0].children[0].strikethrough).toBe(true);
  });

  test('parses <sub> and <sup> as script', () => {
    const frame = htmlToTextFrame('<p>normal<sub>sub</sub><sup>super</sup></p>');
    const runs = frame.paragraphs[0].children;
    expect(runs).toHaveLength(3);
    expect(runs[1].script).toBe('sub');
    expect(runs[2].script).toBe('super');
  });

  test('parses <span> with inline style', () => {
    const frame = htmlToTextFrame('<p><span style="color:red; font-size:18px">styled</span></p>');
    const run = frame.paragraphs[0].children[0];
    expect(run.color).toBe('red');
    expect(run.fontSize).toBe(18);
  });

  test('parses headings with default sizes', () => {
    const frame = htmlToTextFrame('<h1>Title</h1><h2>Subtitle</h2>');
    expect(frame.paragraphs).toHaveLength(2);
    expect(firstRun(frame.paragraphs[0]).fontSize).toBe(32);
    expect(firstRun(frame.paragraphs[0]).fontWeight).toBe('bold');
    expect(firstRun(frame.paragraphs[1]).fontSize).toBe(24);
  });

  test('parses <div> as block element', () => {
    const frame = htmlToTextFrame('<div>Block</div><div>Content</div>');
    expect(frame.paragraphs).toHaveLength(2);
    expect(frame.paragraphs[0].children[0].text).toBe('Block');
    expect(frame.paragraphs[1].children[0].text).toBe('Content');
  });

  test('parses <mark> with background color', () => {
    const frame = htmlToTextFrame('<p><mark>highlighted</mark></p>');
    expect(frame.paragraphs[0].children[0].backgroundColor).toBe('#ffff00');
  });

  test('parses <br> as forced line break', () => {
    const frame = htmlToTextFrame('<p>line1<br>line2</p>');
    // <br> inserts \n; runs with same style are merged so text = "line1\nline2"
    expect(frame.paragraphs[0].children).toHaveLength(1);
    expect(frame.paragraphs[0].children[0].text).toBe('line1\nline2');
  });

  test('parses nested inline tags', () => {
    const frame = htmlToTextFrame('<p><b>bold <i>bold italic</i></b></p>');
    const runs = frame.paragraphs[0].children;
    expect(runs).toHaveLength(2);
    expect(runs[0].text).toBe('bold ');
    expect(runs[0].fontWeight).toBe('bold');
    expect(runs[0].fontStyle).toBe('normal');
    expect(runs[1].text).toBe('bold italic');
    expect(runs[1].fontWeight).toBe('bold');
    expect(runs[1].fontStyle).toBe('italic');
  });

  test('applies default style from options', () => {
    const frame = htmlToTextFrame('<p>Text</p>', {
      defaultStyle: { fontFamily: 'Times New Roman', fontSize: 16, color: '#333' },
    });
    const run = frame.paragraphs[0].children[0];
    expect(run.fontFamily).toBe('Times New Roman');
    expect(run.fontSize).toBe(16);
    expect(run.color).toBe('#333');
  });

  test('sets frame properties from options', () => {
    const frame = htmlToTextFrame('<p>Text</p>', {
      width: 800,
      height: 600,
      wrap: false,
    });
    expect(frame.width).toBe(800);
    expect(frame.height).toBe(600);
    expect(frame.wrap).toBe(false);
  });

  test('parses unordered list', () => {
    const frame = htmlToTextFrame('<ul><li>Item A</li><li>Item B</li></ul>');
    expect(frame.paragraphs).toHaveLength(2);
    // Marker is prepended to the first run (same style)
    expect(frame.paragraphs[0].children[0].text).toBe('• Item A');
    expect(frame.paragraphs[1].children[0].text).toBe('• Item B');
  });

  test('parses ordered list with incrementing numbers', () => {
    const frame = htmlToTextFrame('<ol><li>First</li><li>Second</li><li>Third</li></ol>');
    expect(frame.paragraphs).toHaveLength(3);
    // Marker is prepended to the first run (same style)
    expect(frame.paragraphs[0].children[0].text).toBe('1. First');
    expect(frame.paragraphs[1].children[0].text).toBe('2. Second');
    expect(frame.paragraphs[2].children[0].text).toBe('3. Third');
  });

  test('merges adjacent text runs with same style', () => {
    const frame = htmlToTextFrame('<p><b>Hello</b> World</p>');
    // Both bold "Hello" and normal " World" have different styles
    const runs = frame.paragraphs[0].children;
    expect(runs).toHaveLength(2);
    expect(runs[0].text).toBe('Hello');
    expect(runs[0].fontWeight).toBe('bold');
    expect(runs[1].text).toBe(' World');
    expect(runs[1].fontWeight).toBe('normal');
  });

  test('parses <code> as monospace', () => {
    const frame = htmlToTextFrame('<p><code>const x = 1;</code></p>');
    expect(frame.paragraphs[0].children[0].fontFamily).toBe('monospace');
  });

  test('parses <pre> with preserved whitespace', () => {
    const frame = htmlToTextFrame('<pre>  line1\n  line2</pre>');
    expect(frame.paragraphs).toHaveLength(1);
    expect(frame.paragraphs[0].children[0].text).toBe('  line1\n  line2');
    expect(frame.paragraphs[0].style.whiteSpace).toBe('pre');
  });

  test('handles empty HTML', () => {
    const frame = htmlToTextFrame('');
    expect(frame.paragraphs).toHaveLength(0);
  });

  test('handles HTML with only whitespace', () => {
    const frame = htmlToTextFrame('   ');
    expect(frame.paragraphs).toHaveLength(0);
  });
});