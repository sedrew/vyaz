/**
 * office-glyph-grid.test.ts — `mode: 'office'` glyph metrics as PowerPoint lays them out.
 *
 * Ground truth: PowerPoint SVG exports of a per-glyph highlighted alphabet
 * (scripts/office-metrics/gen-glyph-alphabet.ts) for Roboto and Times New Roman at
 * 20pt / 11pt, plus a Roboto 72pt "To Ta" case:
 *   - every one of 266 glyph advances is an exact multiple of 1/8 pt and equals the
 *     font advance rounded to the nearest 1/8 pt (only 104 equal the exact advance);
 *   - Roboto is never kerned — "To" / "Ta" at 72pt have the same T advance (43.000pt)
 *     although the font kerns them by -3.5 / -4.0pt;
 *   - Times New Roman (kern table) is unkerned at 11pt and kerned at 20pt.
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { registerUnifont, registerArialVariants, registerFixtureFonts } from './helpers.ts';
import { layoutTextFrame } from '@vyaz/core';
import type { LayoutOptions } from '../src/layout/TextFrameLayoutEngine.js';

beforeAll(async () => {
  await registerUnifont(); // other files rely on Unifont being the first registered family
  await registerArialVariants();
  await registerFixtureFonts();
});

function width(text: string, family: string, size: number, options: LayoutOptions = {}) {
  return layoutTextFrame(
    {
      wrap: true,
      paragraphs: [
        {
          style: { alignment: 'left', lineHeight: 1, spaceBefore: 0, spaceAfter: 0, whiteSpace: 'normal' },
          children: [{ type: 'text', text, fontFamily: family, fontSize: size } as any],
        },
      ],
    },
    { mode: 'office', onMissingFont: 'substitute', textBoxPadding: 0, ...options },
  ).textBox.width;
}

describe('1/8pt glyph advance grid (office default)', () => {
  test('Roboto 72pt: each glyph matches the PowerPoint export', () => {
    // PowerPoint SVG export (Roboto 72pt, per-glyph highlight): T 43.000, o 41.125, space 17.875, a 39.125 pt
    expect(width('T', 'Roboto', 72)).toBeCloseTo(43.0, 1);
    expect(width('o', 'Roboto', 72)).toBeCloseTo(41.125, 1); // 41.0625 rounds UP to 41.125 (…328.5/8 → 329/8)
    expect(width('a', 'Roboto', 72)).toBeCloseTo(39.125, 1);
  });

  test('Roboto 72pt "To Ta" is 184.125pt, the width PowerPoint drew (no kerning)', () => {
    expect(width('To Ta', 'Roboto', 72)).toBeCloseTo(184.125, 1);
  });

  test.each([20, 11, 24])('%ipt: a glyph line is a whole number of 1/8pt units', (size) => {
    for (const ch of ['A', 'g', 'W', '5', '%', 'i']) {
      const eighths = width(ch, 'Roboto', size) * 8;
      expect(Math.abs(eighths - Math.round(eighths))).toBeLessThan(0.06);
    }
  });

  test('advanceQuantum: 0 turns the grid off (exact advance 41.0625pt)', () => {
    expect(width('o', 'Roboto', 72, { advanceQuantum: 0 })).toBeCloseTo(41.0625, 1);
    expect(width('o', 'Roboto', 72, { advanceQuantum: 0 })).not.toBeCloseTo(41.125, 2);
  });

  test('browser mode has no grid', () => {
    expect(width('o', 'Roboto', 72, { mode: 'browser' })).toBeCloseTo(41.0625, 1);
  });
});

describe('kerning policy: kern-table fonts from 12pt, GPOS-only fonts never', () => {
  test('Roboto (no kern table) is not kerned at 20pt: "To" 23.25pt, "LT" 22.625pt as exported', () => {
    expect(width('To', 'Roboto', 20)).toBeCloseTo(23.25, 1);
    expect(width('LT', 'Roboto', 20)).toBeCloseTo(22.625, 1);
  });

  test('explicit shaping: true kerns Roboto anyway (opt-in for every font)', () => {
    expect(width('LT', 'Roboto', 20, { shaping: true })).toBeLessThan(width('LT', 'Roboto', 20) - 1);
  });

  test('Arial (has a kern table) kerns from 12pt, not below', () => {
    for (const size of [12, 20, 72]) {
      expect(width('To', 'Arial', size)).toBeLessThan(width('To', 'Arial', size, { shaping: false }) - 0.5);
    }
    for (const size of [9, 11]) {
      expect(width('To', 'Arial', size)).toBeCloseTo(width('To', 'Arial', size, { shaping: false }), 2);
    }
  });
});

describe('textBoxPadding (office: 1pt, on textBox.width only)', () => {
  const box = (options: LayoutOptions) =>
    layoutTextFrame(
      {
        wrap: true,
        paragraphs: [{ style: { alignment: 'left', lineHeight: 1, spaceBefore: 0, spaceAfter: 0, whiteSpace: 'normal' }, children: [{ type: 'text', text: 'To Ta', fontFamily: 'Roboto', fontSize: 72 } as any] }],
      },
      { mode: 'office', onMissingFont: 'substitute', ...options },
    );

  test('office default adds 1pt to textBox.width, once', () => {
    const plain = box({ textBoxPadding: 0 });
    const padded = box({});
    expect(padded.textBox.width - plain.textBox.width).toBeCloseTo(1.0, 1);
    expect(padded.content.width).toBeCloseTo(plain.content.width, 2);
  });

  test('a box of textBox.width has room for the text (never narrower than it)', () => {
    expect(box({}).textBox.width).toBeGreaterThan(box({ textBoxPadding: 0 }).content.width);
  });

  test('browser mode adds nothing; the option overrides both ways', () => {
    expect(box({ mode: 'browser' }).textBox.width).toBeCloseTo(box({ mode: 'browser', textBoxPadding: 0 }).textBox.width, 2);
    expect(box({ textBoxPadding: 1 }).textBox.width - box({ textBoxPadding: 0 }).textBox.width).toBeCloseTo(1, 1);
  });
});

describe('prepared-line cache does not cross-feed the grid', () => {
  test('same text laid out with and without the grid back to back', () => {
    const grid = width('o', 'Roboto', 72);
    const exact = width('o', 'Roboto', 72, { advanceQuantum: 0 });
    const gridAgain = width('o', 'Roboto', 72);
    expect(grid).toBeCloseTo(41.125, 1);
    expect(exact).toBeCloseTo(41.0625, 1);
    expect(gridAgain).toBe(grid);
  });
});
