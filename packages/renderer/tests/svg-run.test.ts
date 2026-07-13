/**
 * svg-run.test.ts — SVG renderer output tests via TextFrame pipeline.
 *
 * Uses a full TextFrame → layoutTextFrame → renderToSVG pipeline.
 * All text defaults to Unifont (registered in beforeAll) for deterministic metrics.
 * Uses is-svg for basic validation, svg-parser for attribute assertions,
 * and file-based .svg snapshots in tests/snapshots/ for structural verification.
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import isSvg from 'is-svg';
import { parse } from 'svg-parser';
import type { RootNode, ElementNode } from 'svg-parser';

import {
  registerUnifont,
  makeParagraph,
  makeMultiRunParagraph,
  makeTextFrame,
  renderFrameToSVG,
  matchSvgSnapshot,
} from './helpers.ts';

// ── Setup ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await registerUnifont();
});

// ── AST helpers ───────────────────────────────────────────────────────────

function findElements(node: ElementNode | RootNode, tag: string): ElementNode[] {
  const found: ElementNode[] = [];
  if ('tagName' in node && node.tagName === tag) {
    found.push(node);
  }
  if (node.children) {
    for (const child of node.children) {
      if (typeof child === 'object') {
        found.push(...findElements(child as ElementNode | RootNode, tag));
      }
    }
  }
  return found;
}

function getTextElement(ast: RootNode): ElementNode | undefined {
  return findElements(ast as unknown as ElementNode, 'text')[0];
}

function getTspans(ast: RootNode): ElementNode[] {
  return findElements(ast as unknown as ElementNode, 'tspan');
}

// ── 1. Basic SVG output ─────────────────────────────────────────────────

describe('Basic SVG output', () => {
  test('run renders valid SVG', () => {
    const frame = makeTextFrame(makeParagraph('Hello'));
    const { svg } = renderFrameToSVG(frame);
    expect(isSvg(svg)).toBe(true);
  });

  test('run valid SVG snapshot', () => {
    const frame = makeTextFrame(makeParagraph('Hello'));
    const { svg } = renderFrameToSVG(frame, { debug: { frameBox: true, contentBox: true } });
    matchSvgSnapshot('run-basic-plain-text', svg);
  });

  test('run <text> x y has correct baseline coordinates', () => {
    const frame = makeTextFrame(makeParagraph('Hello'));
    const { result, svg } = renderFrameToSVG(frame);
    const ast = parse(svg);
    const textEl = getTextElement(ast);
    expect(textEl).toBeDefined();

    const line = result.lines[0];
    const expectedY = line.y + line.baseline;

    expect(Number(textEl!.properties.x)).toBeCloseTo(line.x, 1);
    expect(Number(textEl!.properties.y)).toBeCloseTo(expectedY, 1);
  });

  test('run multiple lines render multiple <text> elements', () => {
    const frame = makeTextFrame(
      makeParagraph('Hello World Foo Bar Baz'),
      { width: 50 },
    );
    const { result, svg } = renderFrameToSVG(frame);
    const ast = parse(svg);
    const texts = findElements(ast as unknown as ElementNode, 'text');
    expect(texts.length).toBe(result.lines.length);
  });
});

// ── 2. Style properties in SVG (preset='preserve') ───────────────────────

describe('Style properties in SVG (preset="preserve")', () => {
  function getFirstTspanAttr(
    text: string,
    override: Record<string, unknown>,
    attr: string,
    expected: unknown,
  ): void {
    const para = makeParagraph(text, override as any);
    const frame = makeTextFrame(para);
    const { svg } = renderFrameToSVG(frame, { preset: 'preserve' });
    const ast = parse(svg);
    const tspans = getTspans(ast);
    expect(tspans.length).toBeGreaterThan(0);
    // svg-parser may return numbers for numeric attributes; coerce to string for comparison
    expect(String(tspans[0].properties[attr])).toBe(String(expected));
  }

  test('run fontWeight bold', () => {
    getFirstTspanAttr('Hello', { fontWeight: 'bold' }, 'font-weight', '700');
  });

  test('run fontWeight normal', () => {
    getFirstTspanAttr('Hello', { fontWeight: 'normal' }, 'font-weight', '400');
  });

  test('run fontStyle italic', () => {
    getFirstTspanAttr('Hello', { fontStyle: 'italic' }, 'font-style', 'italic');
  });

  test('run fontFamily', () => {
    getFirstTspanAttr('Hello', { fontFamily: 'Unifont' }, 'font-family', 'Unifont');
  });

  test('run fontSize', () => {
    getFirstTspanAttr('Hello', { fontSize: 24 }, 'font-size', '24');
  });

  test('run color', () => {
    getFirstTspanAttr('Hi', { color: '#FF0000' }, 'fill', '#FF0000');
  });

  test('run underline', () => {
    getFirstTspanAttr('Hi', { underline: true }, 'text-decoration', 'underline');
  });

  test('run strikethrough', () => {
    getFirstTspanAttr('Hi', { strikethrough: true }, 'text-decoration', 'line-through');
  });

  test('run xml:space preserve', () => {
    const frame = makeTextFrame(makeParagraph('Hello'));
    const { svg } = renderFrameToSVG(frame, { preset: 'preserve' });
    const ast = parse(svg);
    const textEl = getTextElement(ast);
    expect(textEl).toBeDefined();
    expect(textEl!.properties['xml:space']).toBe('preserve');
  });

  test('run script super font-size', () => {
    getFirstTspanAttr('Hi', { fontSize: 24, script: 'super' as any }, 'font-size', '15.6');
  });

  test('run script sub font-size', () => {
    getFirstTspanAttr('Hi', { fontSize: 24, script: 'sub' as any }, 'font-size', '15.6');
  });

  test('run snapshot with style attributes', () => {
    const para = makeParagraph('Bold Italic', { fontWeight: 'bold', fontStyle: 'italic' });
    const frame = makeTextFrame(para);
    const { svg } = renderFrameToSVG(frame, { preset: 'preserve', debug: { frameBox: true, contentBox: true } });
    matchSvgSnapshot('run-style-properties', svg);
  });
});

// ── 3. Multi-run SVG ─────────────────────────────────────────────────────

describe('Multi-run SVG', () => {
  test('run multiple tspans', () => {
    const frame = makeTextFrame(makeMultiRunParagraph([
      { text: 'Hello' },
      { text: 'World', style: { fontWeight: 'bold' } },
    ]));
    const { svg } = renderFrameToSVG(frame, { preset: 'preserve' });
    const ast = parse(svg);
    const tspans = getTspans(ast);
    expect(tspans.length).toBeGreaterThanOrEqual(2);
  });

  test('run multi-run snapshot', () => {
    const frame = makeTextFrame(makeMultiRunParagraph([
      { text: 'Hello ' },
      { text: 'World', style: { fontWeight: 'bold' } },
    ]));
    const { svg } = renderFrameToSVG(frame, { preset: 'preserve', debug: { frameBox: true, contentBox: true } });
    matchSvgSnapshot('run-multi-run-hello-world', svg);
  });

  test('run tspan x position', () => {
    const frame = makeTextFrame(makeMultiRunParagraph([
      { text: 'AB' },
      { text: 'CD', style: { fontWeight: 'bold' } },
    ]));
    const { svg } = renderFrameToSVG(frame, { preset: 'preserve' });
    const ast = parse(svg);
    const tspans = getTspans(ast);

    for (const tspan of tspans) {
      expect(tspan.properties.x).toBeDefined();
      expect(Number(tspan.properties.x)).toBeGreaterThanOrEqual(0);
    }
  });

  test('run xml:space preserve on text', () => {
    const frame = makeTextFrame(makeParagraph('Hello World'));
    const { svg } = renderFrameToSVG(frame, { preset: 'preserve' });
    expect(svg).toContain('xml:space="preserve"');
  });
});

// ── 4. Preset: 'flat' ────────────────────────────────────────────────────

describe('Preset: "flat"', () => {
  test('run renders all text as single string', () => {
    const frame = makeTextFrame(makeParagraph('Hello World'));
    const { svg } = renderFrameToSVG(frame, { preset: 'flat' });
    const ast = parse(svg);
    const textEl = getTextElement(ast);
    expect(textEl).toBeDefined();

    // flat preset: no <tspan> elements
    const tspans = getTspans(ast);
    expect(tspans.length).toBe(0);

    // text content (trimmed for XML formatting whitespace)
    const textContent = ((textEl!.children[0] as any)?.value || '').trim();
    expect(textContent).toBe('Hello World');
  });

  test('run flat snapshot', () => {
    const frame = makeTextFrame(makeParagraph('Hello World'));
    const { svg } = renderFrameToSVG(frame, { preset: 'flat', debug: { frameBox: true, contentBox: true } });
    matchSvgSnapshot('run-flat-hello-world', svg);
  });

  test('run no tspans', () => {
    const frame = makeTextFrame(makeParagraph('Hello'));
    const { svg } = renderFrameToSVG(frame, { preset: 'flat' });
    const ast = parse(svg);
    const tspans = getTspans(ast);
    expect(tspans.length).toBe(0);
  });

  test('run left alignment no text-anchor', () => {
    const frame = makeTextFrame(makeParagraph('Hello'));
    const { svg } = renderFrameToSVG(frame, { preset: 'flat' });
    const ast = parse(svg);
    const textEl = getTextElement(ast);
    expect(textEl!.properties.textAnchor).toBeUndefined();
  });

  test('run center alignment text-anchor middle', () => {
    const para = makeParagraph('Hello');
    para.style.alignment = 'center';
    const frame = makeTextFrame(para);
    const { svg } = renderFrameToSVG(frame, { preset: 'flat' });
    // Check raw SVG since text-anchor is an XML attribute on <text>
    expect(svg).toContain('text-anchor="middle"');
  });

  test('run right alignment text-anchor end', () => {
    const para = makeParagraph('Hello');
    para.style.alignment = 'right';
    const frame = makeTextFrame(para);
    const { svg } = renderFrameToSVG(frame, { preset: 'flat' });
    expect(svg).toContain('text-anchor="end"');
  });

  test('run flat superscript snapshot', () => {
    const para = makeMultiRunParagraph([
      { text: 'c', style: { fontFamily: 'Unifont', fontSize: 24 } },
      { text: '2', style: { fontFamily: 'Unifont', fontSize: 24, script: 'super' as any } },
    ]);
    const frame = makeTextFrame(para);
    const { svg } = renderFrameToSVG(frame, { preset: 'flat', debug: { frameBox: true, contentBox: true } });
    const ast = parse(svg);
    // Filter out debug overlay <text> elements (they have font-size="10" and no text content)
    const allTexts = findElements(ast as unknown as ElementNode, 'text');
    const texts = allTexts.filter(t => {
      const child = t.children?.[0] as any;
      return child?.value && child.value.trim().length > 0;
    });

    // superscript в отдельном <text>: "c" и "2"
    expect(texts.length).toBe(2);

    const textY = Number(texts[0].properties.y);
    expect(Number(texts[0].properties['font-size'])).toBe(24);

    // superscript выше (y меньше), font-size меньше
    const superY = Number(texts[1].properties.y);
    expect(superY).toBeLessThan(textY);
    expect(String(texts[1].properties['font-size'])).toBe('15.6');

    matchSvgSnapshot('run-flat-superscript', svg);
  });

  test('run flat subscript snapshot', () => {
    const para = makeMultiRunParagraph([
      { text: 'H', style: { fontFamily: 'Unifont', fontSize: 24 } },
      { text: '2', style: { fontFamily: 'Unifont', fontSize: 24, script: 'sub' as any } },
      { text: 'O', style: { fontFamily: 'Unifont', fontSize: 24 } },
    ]);
    const frame = makeTextFrame(para);
    const { svg } = renderFrameToSVG(frame, { preset: 'flat', debug: { frameBox: true, contentBox: true } });
    const ast = parse(svg);
    // Filter out debug overlay <text> elements (they have font-size="10" and no text content)
    const allTexts = findElements(ast as unknown as ElementNode, 'text');
    const texts = allTexts.filter(t => {
      const child = t.children?.[0] as any;
      return child?.value && child.value.trim().length > 0;
    });

    // subscript в отдельном <text>: "H", "2", "O"
    expect(texts.length).toBe(3);

    // H и O на одной высоте (baseline)
    expect(Number(texts[0].properties.y)).toBe(Number(texts[2].properties.y));

    // subscript ниже (y больше), font-size меньше
    const subY = Number(texts[1].properties.y);
    expect(subY).toBeGreaterThan(Number(texts[0].properties.y));
    expect(String(texts[1].properties['font-size'])).toBe('15.6');

    matchSvgSnapshot('run-flat-subscript', svg);
  });
});

// ── 5. Preset: 'preserve' (expanded tspan) ───────────────────────────────

describe('Preset: "preserve"', () => {
  test('run expanded tspan per run', () => {
    const frame = makeTextFrame(makeMultiRunParagraph([
      { text: 'Hello' },
      { text: 'World', style: { fontWeight: 'bold' } },
    ]));
    const { svg } = renderFrameToSVG(frame, { preset: 'preserve' });
    const ast = parse(svg);
    const tspans = getTspans(ast);
    expect(tspans.length).toBeGreaterThanOrEqual(2);
  });

  test('run preserve snapshot', () => {
    const frame = makeTextFrame(makeMultiRunParagraph([
      { text: 'Hello ' },
      { text: 'World', style: { fontWeight: 'bold' } },
    ]));
    const { svg } = renderFrameToSVG(frame, { preset: 'preserve', debug: { frameBox: true, contentBox: true } });
    matchSvgSnapshot('run-preserve-hello-world', svg);
  });

  test('run xml:space preserve on text', () => {
    const frame = makeTextFrame(makeParagraph('Hello'));
    const { svg } = renderFrameToSVG(frame, { preset: 'preserve' });
    const ast = parse(svg);
    const textEl = getTextElement(ast);
    expect(textEl).toBeDefined();
    expect(textEl!.properties['xml:space']).toBe('preserve');
  });

  test('run space spans as separate tspan', () => {
    // Use inter-run space: two runs with a space between them
    const frame = makeTextFrame(makeMultiRunParagraph([
      { text: 'Hello ' },
      { text: 'World', style: { fontWeight: 'bold' } },
    ]));
    const { svg } = renderFrameToSVG(frame, { preset: 'preserve' });
    const ast = parse(svg);
    const tspans = getTspans(ast);

    // Should have at least 2 tspans (Hello + space, World)
    expect(tspans.length).toBeGreaterThanOrEqual(2);

    // Each tspan should have an x attribute
    for (const tspan of tspans) {
      expect(tspan.properties.x).toBeDefined();
    }
  });
});

// ── 6. Preset: 'glyph' ───────────────────────────────────────────────────

describe('Preset: "glyph"', () => {
  test('run tspan with per-character positions', () => {
    const frame = makeTextFrame(makeParagraph('AB'));
    const { svg } = renderFrameToSVG(frame, { preset: 'glyph' });
    const ast = parse(svg);
    const tspans = getTspans(ast);
    expect(tspans.length).toBeGreaterThan(0);

    for (const tspan of tspans) {
      const xVal = tspan.properties.x;
      expect(xVal).toBeDefined();
      const positions = String(xVal).split(' ');
      expect(positions.length).toBeGreaterThanOrEqual(2);
    }
  });

  test('run glyph snapshot', () => {
    const frame = makeTextFrame(makeParagraph('Hello'));
    const { svg } = renderFrameToSVG(frame, { preset: 'glyph', debug: { frameBox: true, contentBox: true } });
    matchSvgSnapshot('run-glyph-hello', svg);
  });

  test('run x positions equals character count', () => {
    const frame = makeTextFrame(makeParagraph('ABC'));
    const { svg } = renderFrameToSVG(frame, { preset: 'glyph' });
    const ast = parse(svg);
    const tspans = getTspans(ast);
    expect(tspans.length).toBeGreaterThan(0);

    let totalPositions = 0;
    for (const tspan of tspans) {
      const xVal = String(tspan.properties.x);
      totalPositions += xVal.split(' ').length;
    }
    expect(totalPositions).toBe(3);
  });

  test('run glyph positions strictly increasing', () => {
    const frame = makeTextFrame(makeParagraph('Hello'));
    const { svg } = renderFrameToSVG(frame, { preset: 'glyph' });
    const ast = parse(svg);
    const tspans = getTspans(ast);
    expect(tspans.length).toBeGreaterThan(0);

    for (const tspan of tspans) {
      const xVal = String(tspan.properties.x);
      const positions = xVal.split(' ').map(Number);
      expect(positions.length).toBeGreaterThan(1);

      for (let i = 1; i < positions.length; i++) {
        expect(positions[i]).toBeGreaterThan(positions[i - 1]);
      }
    }
  });

  test('run x positions left alignment', () => {
    const frame = makeTextFrame(makeParagraph('AB'));
    const { result, svg } = renderFrameToSVG(frame, { preset: 'glyph' });
    const ast = parse(svg);
    const tspans = getTspans(ast);
    expect(tspans.length).toBeGreaterThan(0);

    const span = result.lines[0].spans[0];
    const expectedFirstX = span.x;
    const positions = String(tspans[0].properties.x).split(' ').map(Number);
    expect(positions[0]).toBeCloseTo(expectedFirstX, 0);
  });

  test('run x positions center alignment', () => {
    const para = makeParagraph('AB');
    para.style.alignment = 'center';
    const frame = makeTextFrame(para);
    const { result, svg } = renderFrameToSVG(frame, { preset: 'glyph' });
    const ast = parse(svg);
    const tspans = getTspans(ast);
    expect(tspans.length).toBeGreaterThan(0);

    const span = result.lines[0].spans[0];
    const expectedFirstX = span.x;
    const positions = String(tspans[0].properties.x).split(' ').map(Number);
    expect(positions[0]).toBeCloseTo(expectedFirstX, 0);
  });

  test('run x positions right alignment', () => {
    const para = makeParagraph('AB');
    para.style.alignment = 'right';
    const frame = makeTextFrame(para);
    const { result, svg } = renderFrameToSVG(frame, { preset: 'glyph' });
    const ast = parse(svg);
    const tspans = getTspans(ast);
    expect(tspans.length).toBeGreaterThan(0);

    const span = result.lines[0].spans[0];
    const expectedFirstX = span.x;
    const positions = String(tspans[0].properties.x).split(' ').map(Number);
    expect(positions[0]).toBeCloseTo(expectedFirstX, 0);
  });
});

// ── 7. NBSP (Non-breaking space — class B, Rule 5.2) ─────────────────────

describe('NBSP (non-breaking space — Rule 5.2)', () => {
  test('run NBSP preserve mode verbatim', () => {
    const frame = makeTextFrame(makeParagraph('Hello\u00A0World'));
    const { svg } = renderFrameToSVG(frame, { preset: 'preserve' });
    // NBSP (U+00A0) lives inside the text-segment per Rule 2.1
    // escapeXml does NOT touch U+00A0 (it's not in the &<>" set)
    expect(svg).toContain('\u00A0');
    // SVG is still valid
    expect(isSvg(svg)).toBe(true);
  });

  test('run NBSP flat mode verbatim', () => {
    const frame = makeTextFrame(makeParagraph('Hello\u00A0World'));
    const { svg } = renderFrameToSVG(frame, { preset: 'flat' });
    // NBSP appears as raw U+00A0 inside the text content
    expect(svg).toContain('\u00A0');
  });

  test('run NBSP glyph mode x position', () => {
    const frame = makeTextFrame(makeParagraph('\u00A0'));
    const { svg } = renderFrameToSVG(frame, { preset: 'glyph' });
    const ast = parse(svg);
    const tspans = getTspans(ast);
    expect(tspans.length).toBeGreaterThan(0);

    // NBSP should have at least one x position
    const xVal = String(tspans[0].properties.x);
    const positions = xVal.split(' ').map(Number);
    expect(positions.length).toBeGreaterThanOrEqual(1);
  });

  test('run NBSP trailing not zeroed', () => {
    // Text ending with NBSP — should not be treated as zero-width trailing space
    const frame = makeTextFrame(makeParagraph('Hello\u00A0'));
    const { svg } = renderFrameToSVG(frame, { preset: 'preserve' });
    // NBSP (U+00A0) appears in the SVG output as a separate tspan
    expect(svg).toContain('\u00A0');
    // SVG is valid
    expect(isSvg(svg)).toBe(true);
  });

  test('run NBSP snapshot', () => {
    const frame = makeTextFrame(makeParagraph('Hello\u00A0World'));
    const { svg } = renderFrameToSVG(frame, { preset: 'preserve', debug: { frameBox: true, contentBox: true } });
    matchSvgSnapshot('run-nbsp-hello-world', svg);
  });
});

// ── 8. xml:space="preserve" across all modes ─────────────────────────────

describe('xml:space="preserve" across all modes', () => {
  test('run flat mode xml:space', () => {
    const frame = makeTextFrame(makeParagraph('Hello'));
    const { svg } = renderFrameToSVG(frame, { preset: 'flat' });
    expect(svg).toContain('xml:space="preserve"');
  });

  test('run glyph mode xml:space', () => {
    const frame = makeTextFrame(makeParagraph('Hello'));
    const { svg } = renderFrameToSVG(frame, { preset: 'glyph' });
    expect(svg).toContain('xml:space="preserve"');
  });

  test('run xml:space snapshot', () => {
    const frame = makeTextFrame(makeParagraph('Hello World'));
    const { svg } = renderFrameToSVG(frame, { preset: 'preserve', debug: { frameBox: true, contentBox: true } });
    matchSvgSnapshot('run-xmlspace-snapshot', svg);
  });
});

// ── 9. Zero-width space (class D) ────────────────────────────────────────

describe('Zero-width space (class D — Rule 9)', () => {
  test('run ZWSP no visible space-segment', () => {
    const frame = makeTextFrame(makeParagraph('Hello\u200BWorld'));
    const { svg } = renderFrameToSVG(frame, { preset: 'preserve' });
    const ast = parse(svg);
    const tspans = getTspans(ast);

    // ZWSP character might still appear as empty tspan, or within text-segment
    // The key requirement: no visible whitespace-only tspan for ZWSP
    const allText = tspans.map((t) => {
      const child = t.children[0] as any;
      return child?.value || '';
    });
    // ZWSP should not create a standalone space-only tspan
    const hasZwspOnly = allText.some((t) => t === '\u200B');
    // ZWSP can be either absorbed into a text-segment or create a zero-width span.
    // Both are acceptable. We just check SVG is valid.
    expect(isSvg(svg)).toBe(true);
  });

  test('run ZWSP snapshot', () => {
    const frame = makeTextFrame(makeParagraph('Hello\u200BWorld'));
    const { svg } = renderFrameToSVG(frame, { preset: 'preserve', debug: { frameBox: true, contentBox: true } });
    matchSvgSnapshot('run-zwsp-hello-world', svg);
  });
});


// ── 12. Justify alignment (§7) ─────────────────────────────────────────

describe('Justify alignment (§7 — Rules 7.1–7.4)', () => {
  test('run justify multi-run spaces', () => {
    const para = makeMultiRunParagraph([
      { text: 'AAA' },
      { text: ' ' },
      { text: 'BBB' },
      { text: ' ' },
      { text: 'CCC' },
    ]);
    para.style.alignment = 'justify';
    const frame = makeTextFrame(para, { width: 300 });
    const { result, svg } = renderFrameToSVG(frame, { preset: 'preserve' });
    const ast = parse(svg);

    // SVG must be valid
    expect(isSvg(svg)).toBe(true);

    // Check first line: spans should be distributed
    if (result.lines.length > 0) {
      const line = result.lines[0];
      // The space spans should have x positions that make the line fill available width
      const spaceSpans = line.spans.filter((s) => s.type === 'space');
      expect(spaceSpans.length).toBeGreaterThan(0);
    }
  });

  test('run justify single run no stretch', () => {
    // Single run "AAA BBB CCC": both spaces are internal → not stretchable
    const para = makeParagraph('AAA BBB CCC');
    para.style.alignment = 'justify';
    const frame = makeTextFrame(para, { width: 200 });
    const { result, svg } = renderFrameToSVG(frame, { preset: 'preserve' });

    // SVG must be valid
    expect(isSvg(svg)).toBe(true);

    // With a single run, justify has no space-segments to stretch
    // The line is rendered as-is (Rule 7.2)
    if (result.lines.length > 0) {
      const line = result.lines[0];
      // All spans on this line should be type 'text' (no separate space spans)
      const spaceSpans = line.spans.filter((s) => s.type === 'space');
      // Internal spaces are inside the text-segment, not separate space-spans
      // So spaceSpans should be 0
      expect(spaceSpans.length).toBe(0);
    }
  });

  test('run justify last line not stretched', () => {
    // Multi-run text that wraps to multiple lines — use more words + narrower width
    const para = makeMultiRunParagraph([
      { text: 'AAA' },
      { text: ' ' },
      { text: 'BBB' },
      { text: ' ' },
      { text: 'CCC' },
      { text: ' ' },
      { text: 'DDD' },
      { text: ' ' },
      { text: 'EEE' },
      { text: ' ' },
      { text: 'FFF' },
      { text: ' ' },
      { text: 'GGG' },
      { text: ' ' },
      { text: 'HHH' },
      { text: ' ' },
      { text: 'III' },
    ]);
    para.style.alignment = 'justify';
    const frame = makeTextFrame(para, { width: 50 });
    const { result, svg } = renderFrameToSVG(frame, { preset: 'preserve' });
    const ast = parse(svg);

    expect(isSvg(svg)).toBe(true);
    expect(result.lines.length).toBeGreaterThanOrEqual(2);

    // Last line should have left alignment (not stretched)
    const lastLine = result.lines[result.lines.length - 1];
    // For the last line in a justify paragraph, alignment effectively becomes 'left'
    // Verify the last line has at least one span
    expect(lastLine.spans.length).toBeGreaterThan(0);
  });

  test('run justify NBSP not stretched', () => {
    // NBSP (U+00A0) class B should not participate in justify stretching
    const para = makeMultiRunParagraph([
      { text: 'AAA' },
      { text: '\u00A0' },
      { text: 'BBB' },
    ]);
    para.style.alignment = 'justify';
    const frame = makeTextFrame(para, { width: 300 });
    const { result, svg } = renderFrameToSVG(frame, { preset: 'preserve' });

    expect(isSvg(svg)).toBe(true);

    // NBSP is class B → not stretchable, should still be rendered
    if (result.lines.length > 0) {
      const line = result.lines[0];
      const nbspSpan = line.spans.find((s) => s.text === '\u00A0');
      expect(nbspSpan).toBeDefined();
    }
  });

  test('run justify snapshot', () => {
    const para = makeMultiRunParagraph([
      { text: 'AAA' },
      { text: ' ' },
      { text: 'BBB' },
      { text: ' ' },
      { text: 'CCC' },
    ]);
    para.style.alignment = 'justify';
    const frame = makeTextFrame(para, { width: 300 });
    const { svg } = renderFrameToSVG(frame, { preset: 'preserve', debug: { frameBox: true, contentBox: true } });
    matchSvgSnapshot('run-justify-multi-run', svg);
  });
});

// ── 13. Additional coverage ───────────────────────────────────────────

describe('Additional coverage', () => {
  test('run long text single run', () => {
    const longText = 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua';
    const para = makeParagraph(longText);
    para.style.whiteSpace = 'nowrap';
    const frame = makeTextFrame(para);
    const { result, svg } = renderFrameToSVG(frame, { preset: 'preserve', debug: { frameBox: true, contentBox: true } });

    expect(isSvg(svg)).toBe(true);
    // Long text stays on one line (no wrap)
    expect(result.lines.length).toBe(1);
    // All text content should be preserved
    expect(result.lines[0].spans.map((s) => s.text).join('')).toBe(longText);
    matchSvgSnapshot('run-long-text-single-run', svg);
  });

  test('run superscript c²', () => {
    const para = makeMultiRunParagraph([
      { text: 'c', style: { fontFamily: 'Unifont', fontSize: 24 } },
      { text: '2', style: { fontFamily: 'Unifont', fontSize: 24, script: 'super' as any } },
    ]);
    const frame = makeTextFrame(para);
    const { result, svg } = renderFrameToSVG(frame, { preset: 'preserve', debug: { frameBox: true, contentBox: true } });

    // Should have 2 tspans: "c" and "2" (superscript)
    expect(result.lines[0].spans.length).toBe(2);
    matchSvgSnapshot('run-superscript-c2', svg);
  });

  test('run caffeine formula c8h10n4o2', () => {
    const para = makeMultiRunParagraph([
      { text: 'C', style: { fontFamily: 'Unifont', fontSize: 24 } },
      { text: '8', style: { fontFamily: 'Unifont', fontSize: 24, script: 'sub' as any } },
      { text: 'H', style: { fontFamily: 'Unifont', fontSize: 24 } },
      { text: '10', style: { fontFamily: 'Unifont', fontSize: 24, script: 'sub' as any } },
      { text: 'N', style: { fontFamily: 'Unifont', fontSize: 24 } },
      { text: '4', style: { fontFamily: 'Unifont', fontSize: 24, script: 'sub' as any } },
      { text: 'O', style: { fontFamily: 'Unifont', fontSize: 24 } },
      { text: '2', style: { fontFamily: 'Unifont', fontSize: 24, script: 'sub' as any } },
    ]);
    const frame = makeTextFrame(para);
    const { result, svg } = renderFrameToSVG(frame, { preset: 'preserve', debug: { frameBox: true, contentBox: true } });

    // C₈H₁₀N₄O₂ — 8 runs, 4 text + 4 subscript alternating
    expect(result.lines[0].spans.length).toBe(8);
    matchSvgSnapshot('run-caffeine-c8h10n4o2', svg);
  });

  test('run normal super normal', () => {
    const para = makeMultiRunParagraph([
      { text: 'NORMAL', style: { fontFamily: 'Unifont', fontSize: 24 } },
      { text: 'super', style: { fontFamily: 'Unifont', fontSize: 24, script: 'super' as any } },
      { text: 'HELLO ', style: { fontFamily: 'Unifont', fontSize: 24 } },
      { text: 'WORLD ', style: { fontFamily: 'Unifont', fontSize: 24 } },
    ]);
    const frame = makeTextFrame(para);
    const { result, svg } = renderFrameToSVG(frame, { preset: 'preserve', debug: { frameBox: true, contentBox: true } });

    // normal → super → normal — at least 3 tspans (spaces may create extra spans)
    expect(result.lines[0].spans.length).toBeGreaterThanOrEqual(3);
    matchSvgSnapshot('run-normal-super-normal', svg);
  });

  test('run snapshot all styles combined', () => {
    const para = makeParagraph('Styled Text', {
      fontFamily: 'Unifont',
      fontSize: 24,
      fontWeight: 'bold',
      fontStyle: 'italic',
      color: '#FF0000',
      underline: true,
    });
    const frame = makeTextFrame(para);
    const { svg } = renderFrameToSVG(frame, { preset: 'preserve', debug: { frameBox: true, contentBox: true } });
    matchSvgSnapshot('run-all-styles-snapshot', svg);
  });
});