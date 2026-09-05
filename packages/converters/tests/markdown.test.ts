/**
 * markdown.test.ts — markdownToTextFrame() (CommonMark + GFM via `marked`,
 * then the existing HTML pipeline — see markdown.ts's module doc).
 *
 * A GFM table (like an HTML <table>) is laid out and rendered *during*
 * conversion (see walk.ts's handleTable()), so — same as tables.test.ts — a
 * real font must be registered here rather than relying on another file's
 * beforeAll to have run first.
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fontMetricsProvider } from '@vyaz/core';
import { convertMd as convertMdRaw, text } from './helpers.ts';
import type { MarkdownConvertOptions } from '../src/index.ts';

beforeAll(async () => {
  const fp = resolve(dirname(fileURLToPath(import.meta.url)), '../../core/tests/fixtures/unifont-17.0.05.otf');
  await fontMetricsProvider.registerFont('Unifont', { weight: 'normal', style: 'normal' }, readFileSync(fp));
});

/** convertMd() with Unifont as the default baseFont, so table rendering never depends on another file's font registration. */
function convertMd(markdown: string, opts: MarkdownConvertOptions = {}) {
  return convertMdRaw(markdown, { baseFont: { family: 'Unifont' }, ...opts });
}

const one = (md: string) => convertMd(md).frame.paragraphs[0];

describe('markdown — CommonMark basics', () => {
  test('a heading scales up from baseFont.size, like an HTML <h1>', () => {
    const r = convertMd('# Title', { baseFont: { family: 'Arial', size: 16 } });
    expect(r.frame.paragraphs[0].children[0].fontSize).toBe(32); // default h1 scale is 2x
  });

  test('bold / italic / strikethrough (GFM ~~x~~)', () => {
    const p = one('**bold** _italic_ ~~gone~~');
    expect(p.children.find((r) => r.text === 'bold')!.fontWeight).toBe('bold');
    expect(p.children.find((r) => r.text === 'italic')!.fontStyle).toBe('italic');
    expect(p.children.find((r) => r.text === 'gone')!.strikethrough).toBe(true);
  });

  test('inline code uses the monospace family', () => {
    const p = one('some `code()` here');
    expect(p.children.find((r) => r.text === 'code()')!.fontFamily).toBe('monospace');
  });

  test('a fenced code block converts (as <pre><code>)', () => {
    const r = convertMd('```\nconst x = 1;\n```');
    expect(text(r.frame.paragraphs[0])).toContain('const x = 1;');
  });

  test('an unordered list converts to bullet paragraphs', () => {
    const r = convertMd('- one\n- two\n- three');
    const texts = r.frame.paragraphs.map((p) => text(p));
    expect(texts).toEqual(['one', 'two', 'three']);
    expect(r.frame.paragraphs.every((p) => p.style.listStyle?.type === 'bullet')).toBe(true);
  });

  test('an ordered list converts to numbered paragraphs', () => {
    const r = convertMd('1. first\n2. second');
    expect(r.frame.paragraphs.every((p) => p.style.listStyle?.type === 'number')).toBe(true);
  });

  test('a blockquote converts', () => {
    const r = convertMd('> quoted text');
    expect(text(r.frame.paragraphs[0])).toBe('quoted text');
  });
});

describe('markdown — links (reuses the html <a> -> TextRun.data.href path)', () => {
  test('[text](url) carries href, same as an HTML <a>', () => {
    const p = one('see the [docs](https://example.com/) for more');
    const run = p.children.find((r) => r.text === 'docs')!;
    expect(run.data).toEqual({ href: 'https://example.com/' });
    expect(run.underline).toBe(true);
  });

  test('a javascript: link is dropped with the same link-href-unsafe warning as HTML', () => {
    const r = convertMd('[bad](javascript:alert(1))');
    const run = r.frame.paragraphs[0].children.find((run) => run.text === 'bad');
    expect(run?.data?.href).toBeUndefined();
    expect(r.warnings.some((w) => w.code === 'link-href-unsafe')).toBe(true);
  });
});

describe('markdown — GFM tables (reuses handleTable, same as an HTML <table>)', () => {
  test('a GFM table converts to a table inline-box widget', () => {
    const md = '| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |';
    const r = convertMd(md);
    expect(Object.keys(r.inlineBoxes)).toHaveLength(1);
    const widgetRun = r.frame.paragraphs.flatMap((p) => p.children).find((run) => run.type === 'inline-box');
    expect(widgetRun?.inlineWidget?.id).toBe(Object.keys(r.inlineBoxes)[0]);
    expect(r.inlineBoxes[widgetRun!.inlineWidget!.id]).toContain('<svg');
  });
});

describe('markdown — raw HTML embedded in the source converts too (no special handling needed)', () => {
  test('an inline <span style> inside a markdown paragraph keeps its style', () => {
    const p = one('plain <span style="color: #ff0000">red</span> text');
    const run = p.children.find((r) => r.text === 'red')!;
    expect(run.color).toBe('#ff0000');
  });

  test('a raw HTML <table> block inside markdown converts the same as a GFM table', () => {
    const md = 'before\n\n<table><tr><td>x</td><td>y</td></tr></table>\n\nafter';
    const r = convertMd(md);
    expect(Object.keys(r.inlineBoxes)).toHaveLength(1);
  });
});

describe('markdown — options', () => {
  test('markdown.breaks:false (default) — a single newline in a paragraph is not a line break', () => {
    const r = convertMd('line one\nline two');
    expect(r.frame.paragraphs).toHaveLength(1);
  });

  test('markdown.breaks:true — a single newline becomes <br> (GitHub-comment style)', () => {
    const r = convertMd('line one\nline two', { markdown: { breaks: true } });
    expect(text(r.frame.paragraphs[0])).toContain('\n');
  });
});
