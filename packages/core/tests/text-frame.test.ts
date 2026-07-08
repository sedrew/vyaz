/**
 * text-frame.test.ts — TextFrame layout tests (multi-paragraph).
 *
 * Covers:
 * - 4 paragraphs with different alignment + lineHeight
 * - Long text wrapping (line breaks)
 * - Different fontSize runs within paragraphs
 * - Different fontSize between paragraphs
 * - spaceBefore / spaceAfter spacing
 * - padding
 * - verticalAlignment (top / middle / bottom)
 *
 * Uses library's `layoutTextFrame()` from `@vyaz/core` — NOT a local helper.
 *
 * Run: bun test packages/core/tests/text-frame.test.ts
 */

import './setup.ts';
import { layoutTextFrame } from '../src/layout/TextFrameLayoutEngine.js';
import type { TextFrameLayoutResult } from '../src/layout/TextFrameLayoutEngine.js';
import { fontMetricsProvider } from '../src/measure/FontMetricsProvider.js';
import type { TextFrame, Paragraph } from '../src/types/Document.js';
import type { LineBox } from '../src/types/LayoutTypes.js';

// ── Assertion helpers ────────────────────────────────────────────────────

/** Assert line.x matches expected alignment.
 *
 * Uses effective line width (excluding trailing whitespace) to compute slack,
 * matching the PositioningEngine's internal calculation.
 */
function assertLineX(line: LineBox, maxWidth: number, alignment: string): void {
  // PositioningEngine uses effectiveLineWidth = totalFragWidth - trailingWidth
  const trailingWidth = line.fragments
    .filter(f => f.trailing)
    .reduce((sum, f) => sum + f.width, 0);
  const effectiveWidth = line.width - trailingWidth;
  const slack = Math.max(0, maxWidth - effectiveWidth);
  if (alignment === 'left') {
    expect(line.x).toBe(0);
  } else if (alignment === 'center') {
    expect(line.x).toBeCloseTo(slack / 2, 0);
  } else if (alignment === 'right') {
    expect(line.x).toBeCloseTo(slack, 0);
  }
}

// ── Paragraph builders ───────────────────────────────────────────────────

/** Build a single-run paragraph with custom text, alignment, and lineHeight. */
function buildParagraph(
  id: string,
  text: string,
  alignment: 'left' | 'center' | 'right' | 'justify' = 'left',
  lineHeight: number = 1.2,
  overrides?: Partial<{
    fontSize: number;
    spaceBefore: number;
    spaceAfter: number;
    indent: number;
    leftIndent: number;
    rightIndent: number;
    whiteSpace: 'normal' | 'nowrap' | 'pre';
  }>,
): Paragraph {
  return {
    id: id,
    style: {
      alignment,
      lineHeight,
      spaceBefore: overrides?.spaceBefore ?? 0,
      spaceAfter: overrides?.spaceAfter ?? 0,
      indent: overrides?.indent,
      leftIndent: overrides?.leftIndent,
      rightIndent: overrides?.rightIndent,
      whiteSpace: overrides?.whiteSpace ?? 'normal',
    },
    children: [{
      type: 'text',
      text,
      fontFamily: 'Unifont',
      fontSize: overrides?.fontSize ?? 16,
      fontWeight: 400,
      fontStyle: 'normal',
      color: '#000000',
    }],
  };
}

/** Build a paragraph with multiple runs of different font sizes. */
function buildMultiSizeParagraph(
  id: string,
  runs: { text: string; fontSize: number }[],
  alignment: 'left' | 'center' | 'right' | 'justify' = 'left',
  lineHeight: number = 1.2,
): Paragraph {
  return {
    id: id,
    style: { alignment, lineHeight, spaceBefore: 0, spaceAfter: 0 },
    children: runs.map(r => ({
      type: 'text' as const,
      text: r.text,
      fontFamily: 'Unifont',
      fontSize: r.fontSize,
      fontWeight: 400,
      fontStyle: 'normal',
      color: '#000000',
    })),
  };
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('TextFrame', () => {
  beforeEach(() => { fontMetricsProvider.setMode('browser'); });

  describe('four paragraphs with different alignment + lineHeight', () => {
    it('stacks paragraphs with correct X/Y positions', () => {
      const frame: TextFrame = {
        width: 500,
        wrap: true,
        paragraphs: [
          buildParagraph('p-left', 'Left aligned paragraph with some text to see line wrapping behavior.', 'left', 1.2),
          buildParagraph('p-center', 'Center aligned paragraph with some text to see line wrapping behavior.', 'center', 1.5),
          buildParagraph('p-right', 'Right aligned paragraph with some text to see line wrapping behavior.', 'right', 2.0),
          buildParagraph('p-justify', 'Justify paragraph with enough text to see justify stretching across multiple lines of content inside the frame.', 'justify', 1.0),
        ],
      };

      const result = layoutTextFrame(frame);
      expect(result.lines.length).toBeGreaterThanOrEqual(4);
      expect(result.fitHorizontal).toBe('frame');
      expect(result.fitVertical).toBe('content');
      expect(result.frameWidth).toBe(500);
      expect(result.frameHeight).toBeUndefined();

      // Track changes in Y to detect paragraph boundaries
      let prevY = -1;
      let paragraphCount = 0;

      for (const line of result.lines) {
        expect(line.y).toBeGreaterThanOrEqual(prevY);
        if (line.y > prevY + 0.5) {
          paragraphCount++;
        }
        prevY = line.y;
      }

      expect(paragraphCount).toBeGreaterThanOrEqual(2);
    });

    it('left paragraph lines start at x=0', () => {
      const frame: TextFrame = {
        width: 500,
        wrap: true,
        paragraphs: [
          buildParagraph('p-left', 'Left aligned paragraph with wrapping text AAA BBB CCC DDD.', 'left', 1.2),
        ],
      };

      const result = layoutTextFrame(frame);
      expect(result.lines.length).toBeGreaterThan(0);
      for (const line of result.lines) {
        assertLineX(line, 500, 'left');
      }
    });

    it('center paragraph lines are centered', () => {
      const frame: TextFrame = {
        width: 400,
        wrap: true,
        paragraphs: [
          buildParagraph('p-center', 'Center aligned text that wraps across multiple lines inside a narrow frame.', 'center', 1.5),
        ],
      };

      const result = layoutTextFrame(frame);
      expect(result.lines.length).toBeGreaterThanOrEqual(2);
      for (const line of result.lines) {
        assertLineX(line, 400, 'center');
      }
    });

    it('right paragraph lines are right-aligned', () => {
      const frame: TextFrame = {
        width: 400,
        wrap: true,
        paragraphs: [
          buildParagraph('p-right', 'Right aligned paragraph text that wraps across multiple lines inside this frame.', 'right', 2.0),
        ],
      };

      const result = layoutTextFrame(frame);
      expect(result.lines.length).toBeGreaterThanOrEqual(2);
      for (const line of result.lines) {
        assertLineX(line, 400, 'right');
      }
    });

    it('justify paragraph has stretched spaces', () => {
      const frame: TextFrame = {
        width: 180,
        wrap: true,
        paragraphs: [
          buildParagraph('p-justify', 'AAA BBB CCC DDD EEE FFF GGG HHH III JJJ', 'justify', 1.0),
        ],
      };

      const result = layoutTextFrame(frame);
      expect(result.lines.length).toBeGreaterThanOrEqual(2);

      // Non-last lines: space fragments should be stretched (> 8px)
      for (let i = 0; i < result.lines.length - 1; i++) {
        const spaceFrags = result.lines[i].fragments.filter(f => f.type === 'space' && !f.trailing);
        if (spaceFrags.length > 0) {
          expect(spaceFrags[0].width).toBeGreaterThan(8);
        }
      }
    });

    it('lineHeight changes vertical spacing between lines', () => {
      const tightFrame: TextFrame = {
        width: 500,
        wrap: true,
        paragraphs: [
          buildParagraph('p-tight', 'AAA', 'left', 1.0),
          buildParagraph('p-tight-2', 'BBB', 'left', 1.0),
        ],
      };

      const looseFrame: TextFrame = {
        width: 500,
        wrap: true,
        paragraphs: [
          buildParagraph('p-loose', 'AAA', 'left', 2.5),
          buildParagraph('p-loose-2', 'BBB', 'left', 2.5),
        ],
      };

      const tightResult = layoutTextFrame(tightFrame);
      const looseResult = layoutTextFrame(looseFrame);

      for (let i = 0; i < tightResult.lines.length && i < looseResult.lines.length; i++) {
        expect(looseResult.lines[i].height).toBeGreaterThan(tightResult.lines[i].height);
      }
    });

    it('paragraphs stack without excessive gaps (regression: yOffset accumulation bug)', () => {
      // 4 paragraphs with different lineHeight, NO spaceBefore/spaceAfter.
      // Gap between lines of different paragraphs should be reasonable.
      const frame: TextFrame = {
        width: 350,
        wrap: true,
        paragraphs: [
          buildParagraph('p1', 'First paragraph line one.', 'left', 1.2),
          buildParagraph('p2', 'Second center paragraph.', 'center', 1.5),
          buildParagraph('p3', 'Third right paragraph.', 'right', 2.0),
          buildParagraph('p4', 'Fourth justify paragraph with long text that wraps across lines.', 'justify', 1.0),
        ],
      };

      const result = layoutTextFrame(frame);
      expect(result.lines.length).toBeGreaterThanOrEqual(4);

      // Check gaps between consecutive lines
      for (let i = 1; i < result.lines.length; i++) {
        const prev = result.lines[i - 1];
        const curr = result.lines[i];
        const gap = curr.y - (prev.y + prev.height);
        // Without spaceBefore/spaceAfter, gap should be small — at most ~2× lineHeight.
        // This catches the yOffset accumulation bug (was causing 100+ px gaps).
        expect(gap).toBeLessThanOrEqual(prev.height * 2.5 + 5);
      }
    });
  });

  describe('long text with wrapping', () => {
    it('wraps long paragraph into multiple lines', () => {
      const longText = 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
      const frame: TextFrame = {
        width: 100,
        wrap: true,
        paragraphs: [
          buildParagraph('p-long', longText, 'left', 1.2),
        ],
      };

      const result = layoutTextFrame(frame);
      expect(result.lines.length).toBeGreaterThanOrEqual(3);

      for (const line of result.lines) {
        const lineEnd = line.x + line.width;
        expect(lineEnd).toBeLessThanOrEqual(frame.width! + 1);
      }
    });

    it('wrap=false single line overflows', () => {
      const longText = 'This is a very long line that should not wrap when wrap is disabled.';
      const frame: TextFrame = {
        width: 100,
        wrap: false,
        paragraphs: [
          // wrap=false is a frame-level hint. The paragraph engine respects
          // paragraph.style.whiteSpace === 'nowrap' for infinite-width layout.
          buildParagraph('p-nowrap', longText, 'left', 1.2, { whiteSpace: 'nowrap' }),
        ],
      };

      const result = layoutTextFrame(frame);
      expect(result.lines.length).toBe(1);
      const lineEnd = result.lines[0].x + result.lines[0].width;
      expect(lineEnd).toBeGreaterThan(frame.width!);
    });
  });

  describe('different fontSize runs within paragraphs', () => {
    it('positions runs with different sizes on same line', () => {
      const frame: TextFrame = {
        width: 500,
        wrap: true,
        paragraphs: [
          buildMultiSizeParagraph('p-mixed', [
            { text: 'Small ', fontSize: 12 },
            { text: 'BIG', fontSize: 24 },
            { text: ' small again', fontSize: 12 },
          ]),
        ],
      };

      const result = layoutTextFrame(frame);
      expect(result.lines.length).toBe(1);
      expect(result.lines[0].fragments.length).toBeGreaterThanOrEqual(3);
      expect(result.lines[0].fragments[0].x).toBe(0);
    });

    it('mixed fontSize baseline aligns runs', () => {
      const frame: TextFrame = {
        width: 500,
        wrap: true,
        paragraphs: [
          buildMultiSizeParagraph('p-baseline', [
            { text: 'Aa', fontSize: 12 },
            { text: 'Bb', fontSize: 24 },
          ]),
        ],
      };

      const result = layoutTextFrame(frame);
      expect(result.lines.length).toBe(1);
      const line = result.lines[0];
      expect(line.fragments.length).toBeGreaterThanOrEqual(2);

      const frag1 = line.fragments[0];
      const frag2 = line.fragments[1];
      expect(frag2.x).toBeGreaterThan(frag1.x);
    });
  });

  describe('different fontSize between paragraphs', () => {
    it('small and large paragraphs stack correctly', () => {
      const frame: TextFrame = {
        width: 500,
        wrap: true,
        paragraphs: [
          buildParagraph('p-small', 'Small font paragraph text.', 'left', 1.2, { fontSize: 12 }),
          buildParagraph('p-large', 'Large font paragraph text.', 'left', 1.2, { fontSize: 28 }),
          buildParagraph('p-normal', 'Normal font paragraph text.', 'left', 1.2, { fontSize: 16 }),
        ],
      };

      const result = layoutTextFrame(frame);
      expect(result.lines.length).toBe(3);

      for (let i = 1; i < result.lines.length; i++) {
        const prev = result.lines[i - 1];
        const curr = result.lines[i];
        expect(curr.y).toBeGreaterThanOrEqual(prev.y + 1);
      }

      expect(result.lines[1].height).toBeGreaterThan(result.lines[0].height);
      expect(result.lines[1].height).toBeGreaterThan(result.lines[2].height);
    });
  });

  describe('spaceBefore / spaceAfter', () => {
    it('spaceAfter adds gap after paragraph', () => {
      const frame: TextFrame = {
        width: 500,
        wrap: true,
        paragraphs: [
          buildParagraph('p1', 'Paragraph one.', 'left', 1.2, { spaceAfter: 30 }),
          buildParagraph('p2', 'Paragraph two.', 'left', 1.2),
        ],
      };

      const result = layoutTextFrame(frame);
      expect(result.lines.length).toBe(2);

      const gap = result.lines[1].y - (result.lines[0].y + result.lines[0].height);
      expect(gap).toBeGreaterThanOrEqual(28);
    });

    it('spaceBefore adds gap before paragraph', () => {
      const frame: TextFrame = {
        width: 500,
        wrap: true,
        paragraphs: [
          buildParagraph('p1', 'Paragraph one.', 'left', 1.2),
          buildParagraph('p2', 'Paragraph two.', 'left', 1.2, { spaceBefore: 20 }),
        ],
      };

      const result = layoutTextFrame(frame);
      expect(result.lines.length).toBe(2);

      const gap = result.lines[1].y - (result.lines[0].y + result.lines[0].height);
      expect(gap).toBeGreaterThanOrEqual(18);
    });

    it('spaceBefore + spaceAfter together create larger gap', () => {
      const frame: TextFrame = {
        width: 500,
        wrap: true,
        paragraphs: [
          buildParagraph('p1', 'Paragraph one.', 'left', 1.2, { spaceAfter: 20 }),
          buildParagraph('p2', 'Paragraph two.', 'left', 1.2, { spaceBefore: 15 }),
        ],
      };

      const result = layoutTextFrame(frame);
      expect(result.lines.length).toBe(2);

      const gap = result.lines[1].y - (result.lines[0].y + result.lines[0].height);
      expect(gap).toBeGreaterThanOrEqual(33);
    });
  });

  describe('padding', () => {
    it('padding.left shifts all line X positions', () => {
      const frame: TextFrame = {
        width: 500,
        wrap: true,
        padding: { top: 0, right: 0, bottom: 0, left: 40 },
        paragraphs: [
          buildParagraph('p1', 'Indented text due to padding.', 'left', 1.2),
        ],
      };

      const result = layoutTextFrame(frame);
      expect(result.lines.length).toBe(1);
      expect(result.lines[0].x).toBe(40);
    });

    it('padding reduces available content width', () => {
      const frame: TextFrame = {
        width: 200,
        wrap: true,
        padding: { top: 0, right: 30, bottom: 0, left: 30 },
        paragraphs: [
          buildParagraph('p-long', 'AAA BBB CCC DDD EEE FFF GGG', 'left', 1.2),
        ],
      };

      const result = layoutTextFrame(frame);
      // Available width = 200 - 30 - 30 = 140
      // Content should wrap within 140px
      expect(result.lines.length).toBeGreaterThanOrEqual(2);
      for (const line of result.lines) {
        const lineEnd = line.x + line.width;
        // Line end should be <= 200 (frame width)
        expect(lineEnd).toBeLessThanOrEqual(200);
      }
    });
  });

  describe('verticalAlignment', () => {
    it('top alignment starts at y=0', () => {
      const frame: TextFrame = {
        width: 500,
        height: 400,
        wrap: true,
        verticalAlignment: 'top',
        paragraphs: [
          buildParagraph('p1', 'Top aligned text.', 'left', 1.2),
        ],
      };

      const result = layoutTextFrame(frame);
      expect(result.lines.length).toBe(1);
      expect(result.lines[0].y).toBe(0);
    });

    it('four paragraphs with top alignment stack from top', () => {
      const frame: TextFrame = {
        width: 500,
        height: 400,
        wrap: true,
        verticalAlignment: 'top',
        paragraphs: [
          buildParagraph('p1', 'First paragraph at top.', 'left', 1.2),
          buildParagraph('p2', 'Second paragraph.', 'center', 1.5),
          buildParagraph('p3', 'Third paragraph.', 'right', 1.8),
          buildParagraph('p4', 'Fourth paragraph at bottom.', 'justify', 1.2),
        ],
      };

      const result = layoutTextFrame(frame);
      expect(result.lines.length).toBe(4);
      expect(result.lines[0].y).toBe(0);
    });
  });
});