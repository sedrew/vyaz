/**
 * svg-renderer.test.ts — SVG renderer output tests via TextFrame pipeline.
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
  test('plain text renders valid SVG', () => {
    const frame = makeTextFrame(makeParagraph('Hello'));
    const { svg } = renderFrameToSVG(frame);
    expect(isSvg(svg)).toBe(true);
  });

  test('valid SVG snapshot', () => {
    const frame = makeTextFrame(makeParagraph('Hello'));
    const { svg } = renderFrameToSVG(frame);
    matchSvgSnapshot('basic-plain-text', svg);
  });

  test('<text x="..." y="..."> has correct baseline coordinates', () => {
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

  test('multiple lines render multiple <text> elements', () => {
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

  test('fontWeight: "bold" → font-weight="700"', () => {
    getFirstTspanAttr('Hello', { fontWeight: 'bold' }, 'font-weight', '700');
  });

  test('fontWeight: "normal" → font-weight="400"', () => {
    getFirstTspanAttr('Hello', { fontWeight: 'normal' }, 'font-weight', '400');
  });

  test('fontStyle: "italic" → font-style="italic"', () => {
    getFirstTspanAttr('Hello', { fontStyle: 'italic' }, 'font-style', 'italic');
  });

  test('fontFamily: "Unifont" → font-family="Unifont"', () => {
    getFirstTspanAttr('Hello', { fontFamily: 'Unifont' }, 'font-family', 'Unifont');
  });

  test('fontSize: 24 → font-size="24"', () => {
    getFirstTspanAttr('Hello', { fontSize: 24 }, 'font-size', '24');
  });

  test('color: "#FF0000" → fill="#FF0000" (SVG uses raw hex in xml mode)', () => {
    getFirstTspanAttr('Hi', { color: '#FF0000' }, 'fill', '#FF0000');
  });

  test('underline: true → text-decoration="underline"', () => {
    getFirstTspanAttr('Hi', { underline: true }, 'text-decoration', 'underline');
  });

  test('strikethrough: true → text-decoration="line-through"', () => {
    getFirstTspanAttr('Hi', { strikethrough: true }, 'text-decoration', 'line-through');
  });

  test('xml:space="preserve" is present', () => {
    const frame = makeTextFrame(makeParagraph('Hello'));
    const { svg } = renderFrameToSVG(frame, { preset: 'preserve' });
    const ast = parse(svg);
    const textEl = getTextElement(ast);
    expect(textEl).toBeDefined();
    expect(textEl!.properties['xml:space']).toBe('preserve');
  });
});

// ── 3. Multi-run SVG ─────────────────────────────────────────────────────

describe('Multi-run SVG', () => {
  test('multiple runs → multiple <tspan> elements inside one <text>', () => {
    const frame = makeTextFrame(makeMultiRunParagraph([
      { text: 'Hello' },
      { text: 'World', style: { fontWeight: 'bold' } },
    ]));
    const { svg } = renderFrameToSVG(frame, { preset: 'preserve' });
    const ast = parse(svg);
    const tspans = getTspans(ast);
    expect(tspans.length).toBeGreaterThanOrEqual(2);
  });

  test('multi-run snapshot', () => {
    const frame = makeTextFrame(makeMultiRunParagraph([
      { text: 'Hello' },
      { text: 'World', style: { fontWeight: 'bold' } },
    ]));
    const { svg } = renderFrameToSVG(frame, { preset: 'preserve' });
    matchSvgSnapshot('multi-run-hello-world', svg);
  });

  test('each <tspan> has correct x position', () => {
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

  test('xml:space="preserve" is present on <text> in preserve mode', () => {
    const frame = makeTextFrame(makeParagraph('Hello World'));
    const { svg } = renderFrameToSVG(frame, { preset: 'preserve' });
    expect(svg).toContain('xml:space="preserve"');
  });
});

// ── 4. Preset: 'flat' ────────────────────────────────────────────────────

describe('Preset: "flat"', () => {
  test('renders all text as a single string inside <text>, no <tspan>', () => {
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

  test('flat snapshot', () => {
    const frame = makeTextFrame(makeParagraph('Hello World'));
    const { svg } = renderFrameToSVG(frame, { preset: 'flat' });
    matchSvgSnapshot('flat-hello-world', svg);
  });

  test('no <tspan> elements', () => {
    const frame = makeTextFrame(makeParagraph('Hello'));
    const { svg } = renderFrameToSVG(frame, { preset: 'flat' });
    const ast = parse(svg);
    const tspans = getTspans(ast);
    expect(tspans.length).toBe(0);
  });

  test('left alignment: no text-anchor attribute', () => {
    const frame = makeTextFrame(makeParagraph('Hello'));
    const { svg } = renderFrameToSVG(frame, { preset: 'flat' });
    const ast = parse(svg);
    const textEl = getTextElement(ast);
    expect(textEl!.properties.textAnchor).toBeUndefined();
  });

  test('center alignment adds text-anchor="middle"', () => {
    const para = makeParagraph('Hello');
    para.style.alignment = 'center';
    const frame = makeTextFrame(para);
    const { svg } = renderFrameToSVG(frame, { preset: 'flat' });
    // Check raw SVG since text-anchor is an XML attribute on <text>
    expect(svg).toContain('text-anchor="middle"');
  });

  test('right alignment adds text-anchor="end"', () => {
    const para = makeParagraph('Hello');
    para.style.alignment = 'right';
    const frame = makeTextFrame(para);
    const { svg } = renderFrameToSVG(frame, { preset: 'flat' });
    expect(svg).toContain('text-anchor="end"');
  });
});

// ── 5. Preset: 'browser' ─────────────────────────────────────────────────

describe('Preset: "browser"', () => {
  test('expanded <tspan> per run', () => {
    const frame = makeTextFrame(makeMultiRunParagraph([
      { text: 'Hello' },
      { text: 'World', style: { fontWeight: 'bold' } },
    ]));
    const { svg } = renderFrameToSVG(frame, { preset: 'browser' });
    const ast = parse(svg);
    const tspans = getTspans(ast);
    expect(tspans.length).toBeGreaterThanOrEqual(2);
  });

  test('browser snapshot', () => {
    const frame = makeTextFrame(makeMultiRunParagraph([
      { text: 'Hello' },
      { text: 'World', style: { fontWeight: 'bold' } },
    ]));
    const { svg } = renderFrameToSVG(frame, { preset: 'browser' });
    matchSvgSnapshot('browser-hello-world', svg);
  });

  test('xml:space="preserve" is present on <text> in browser mode', () => {
    const frame = makeTextFrame(makeParagraph('Hello'));
    const { svg } = renderFrameToSVG(frame, { preset: 'browser' });
    const ast = parse(svg);
    const textEl = getTextElement(ast);
    expect(textEl).toBeDefined();
    expect(textEl!.properties['xml:space']).toBe('preserve');
  });

  test('space spans are rendered as separate <tspan>', () => {
    const frame = makeTextFrame(makeMultiRunParagraph([
      { text: 'Hello' },
      { text: ' World', style: { fontWeight: 'bold' } },
    ]));
    const { svg } = renderFrameToSVG(frame, { preset: 'browser' });
    const ast = parse(svg);
    const tspans = getTspans(ast);

    // Should have at least one tspan containing only whitespace (the space between runs)
    const allText = tspans.map((t) => {
      const child = t.children[0] as any;
      return child?.value || '';
    });
    const hasSpaceOnly = allText.some((t) => t.trim() === '' && t.length > 0);
    expect(hasSpaceOnly).toBe(true);
  });
});

// ── 6. Preset: 'glyph' ───────────────────────────────────────────────────

describe('Preset: "glyph"', () => {
  test('<tspan x="x0 x1 x2 ..."> with per-character positions', () => {
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

  test('glyph snapshot', () => {
    const frame = makeTextFrame(makeParagraph('Hello'));
    const { svg } = renderFrameToSVG(frame, { preset: 'glyph' });
    matchSvgSnapshot('glyph-hello', svg);
  });

  test('number of x positions equals character count', () => {
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

  test('each glyph has its own x position, positions strictly increasing', () => {
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

  test('correct x positions for left alignment', () => {
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

  test('correct x positions for center alignment', () => {
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

  test('correct x positions for right alignment', () => {
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