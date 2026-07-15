/**
 * svg-highlight.test.ts — SVG renderer highlight marker (backgroundColor) tests.
 *
 * Tests that backgroundColor on TextRun produces <rect> elements in SVG output
 * with correct position and color.
 */

import { describe, test, expect, beforeAll } from 'bun:test';
import isSvg from 'is-svg';

import {
  registerUnifont,
  makeParagraph,
  makeMultiRunParagraph,
  makeTextFrame,
  renderFrameToSVG,
  matchSvgSnapshot,
} from './helpers.ts';
import type { SvgPreset } from './helpers.ts';

// ── Setup ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await registerUnifont();
});

// ── Presets to test snapshots with ─────────────────────────────────────────

const ALL_PRESETS: SvgPreset[] = ['flat', 'browser', 'preserve', 'glyph'];

// ── Basic sanity checks (single preset) ────────────────────────────────────

describe('Highlight marker — basic checks', () => {
  test('produces valid SVG', () => {
    const para = makeMultiRunParagraph([
      { text: 'Hello ', style: { backgroundColor: '#FFFF00' } },
      { text: 'World', style: {} },
    ]);
    const { svg } = renderFrameToSVG(makeTextFrame(para), { preset: 'preserve' });
    expect(isSvg(svg)).toBe(true);
  });

  test('contains rect element', () => {
    const para = makeMultiRunParagraph([
      { text: 'Highlighted', style: { backgroundColor: '#FFFF00' } },
    ]);
    const { svg } = renderFrameToSVG(makeTextFrame(para), { preset: 'preserve' });
    expect(svg).toContain('<rect ');
    expect(svg).toContain('fill="#FFFF00"');
  });

  test('no rect when no backgroundColor', () => {
    const { svg } = renderFrameToSVG(makeTextFrame(makeParagraph('No highlight')), { preset: 'preserve' });
    expect(svg).not.toContain('<rect ');
  });
});

// ── Partial highlight (one run highlighted) ────────────────────────────────

describe('Partial highlight — all presets', () => {
  const para = makeMultiRunParagraph([
    { text: 'Hello ', style: { backgroundColor: '#FFFF00' } },
    { text: 'World', style: {} },
  ]);
  const frame = makeTextFrame(para);

  for (const preset of ALL_PRESETS) {
    test(preset, () => {
      const { svg } = renderFrameToSVG(frame, { preset, debug: { frameBox: true, contentBox: true } });
      matchSvgSnapshot(`highlight-partial-${preset}`, svg);
    });
  }
});

// ── Two different highlight colors ─────────────────────────────────────────

describe('Two highlight colors — all presets', () => {
  const para = makeMultiRunParagraph([
    { text: 'Yellow ', style: { backgroundColor: '#FFFF00' } },
    { text: 'Red', style: { backgroundColor: '#FF0000', color: '#FFFFFF' } },
  ]);
  const frame = makeTextFrame(para);

  for (const preset of ALL_PRESETS) {
    test(preset, () => {
      const { svg } = renderFrameToSVG(frame, { preset, debug: { frameBox: true, contentBox: true } });
      matchSvgSnapshot(`highlight-two-colors-${preset}`, svg);
    });
  }
});

// ── Full highlight + underline ────────────────────────────────────────────

describe('Full highlight with underline', () => {
  test('preserve snapshot', () => {
    const para = makeParagraph('Highlighted & Underlined', {
      backgroundColor: '#FFFF00',
      underline: true,
    });
    const { svg } = renderFrameToSVG(makeTextFrame(para), { preset: 'preserve', debug: { frameBox: true, contentBox: true } });
    expect(svg).toContain('<rect ');
    expect(svg).toContain('text-decoration="underline"');
    matchSvgSnapshot('highlight-underline', svg);
  });
});