/**
 * office-fit-stress.test.ts — a box sized by vyaz's office width must hold its text.
 *
 * The self-checkable half of the PowerPoint stress deck (scripts/office-metrics/gen-stress.ts:
 * 30 slides, 12 fonts, 8 → 120pt, every box exactly `textBox.width`). PowerPoint is the oracle
 * for the deck; here we pin what vyaz itself promises, so a change that breaks the promise fails
 * before anyone exports a slide:
 *
 *   - a frame of `textBox.width` keeps the text on ONE line, with no horizontal overflow;
 *   - `textBox.width` = exact width + 1pt (`OFFICE_TEXTBOX_PADDING`), rounded up; `content.width` is exact
 *     (rounded up to 0.01 only);
 *   - a frame below the exact width wraps (so the padding is what makes the difference);
 *   - GPOS-only fonts (Roboto, Inter) are never kerned; the exact width sits on the 1/8pt grid;
 *   - `stress.json` (the deck's expected data) still matches the engine for Roboto.
 *
 * Roboto / Inter come from the test fixtures; the Arial block no-ops where Arial is absent (CI).
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerUnifont, registerFixtureFonts, registerArialVariants } from './helpers.ts';
import { fontMetricsProvider } from '../src/measure/FontMetricsProvider.js';
import { layoutTextFrame } from '../src/layout/TextFrameLayoutEngine.js';
import type { LayoutOptions } from '../src/layout/TextFrameLayoutEngine.js';

beforeAll(async () => {
  await registerUnifont(); // other files rely on Unifont being the first registered family
  await registerFixtureFonts();
  await registerArialVariants();
});

const PAD = 1.0; // see OFFICE_TEXTBOX_PADDING in TextFrameLayoutEngine.ts

function lay(family: string, text: string, size: number, width?: number, options: LayoutOptions = {}) {
  return layoutTextFrame(
    {
      width,
      wrap: true,
      paragraphs: [
        {
          style: { alignment: 'left', lineHeight: 1, spaceBefore: 0, spaceAfter: 0, whiteSpace: 'normal' },
          children: [{ type: 'text', text, fontFamily: family, fontSize: size } as any],
        },
      ],
    },
    { mode: 'office', onMissingFont: 'substitute', ...options },
  );
}

// Same size list and string bands as gen-stress.ts
const SIZES = [8, 9, 9.19, 10, 10.5, 11, 12, 13.5, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72, 96, 120];
const TEXTS = {
  small: ['Targets are agreed in advance.', 'Two Yellow Pears Fly Away.', 'Wavy Tall Trees Yield Fruit, 1234.', 'Sixty-Five (65%) of TVs, AV & Co.'],
  mid: ['Ta yo', 'AV yo Ty', 'Two Yellow Pears', 'Wavy Fly, 1994'],
  large: ['Ta yo', 'AV yo', 'To Ta', 'Yo Wa'],
};
const textsFor = (size: number) => (size <= 20 ? TEXTS.small : size <= 54 ? TEXTS.mid : TEXTS.large);

describe.each(['Roboto', 'Inter'])('%s: a box of textBox.width holds its text', (family) => {
  test.each(SIZES)('%ipt: one line, no overflow, padded width', (size) => {
    for (const text of textsFor(size)) {
      const exact = lay(family, text, size, undefined, { textBoxPadding: 0 });
      const rep = lay(family, text, size);
      // padding is added once, on textBox.width only
      expect(rep.content.width).toBeCloseTo(exact.content.width, 2);
      expect(rep.textBox.width - exact.textBox.width).toBeGreaterThanOrEqual(PAD - 0.011);
      expect(rep.textBox.width - exact.textBox.width).toBeLessThanOrEqual(PAD + 0.011);
      // the frame the deck draws
      const boxed = lay(family, text, size, rep.textBox.width);
      expect(boxed.lines.length).toBe(1);
      expect(boxed.overflow.horizontal).toBe(false);
    }
  });

  test.each(SIZES)('%ipt: a frame 0.06pt under the exact width wraps', (size) => {
    for (const text of textsFor(size)) {
      const exact = lay(family, text, size, undefined, { textBoxPadding: 0 }).content.width;
      expect(lay(family, text, size, exact - 0.06).lines.length).toBeGreaterThanOrEqual(2);
    }
  });

  test.each(SIZES)('%ipt: never kerned (GPOS-only font)', (size) => {
    for (const text of textsFor(size)) {
      expect(lay(family, text, size).textBox.width).toBeCloseTo(lay(family, text, size, undefined, { shaping: false }).textBox.width, 2);
    }
  });
});

describe('Roboto: the exact width sits on the 1/8pt glyph grid', () => {
  test.each(SIZES)('%ipt', (size) => {
    for (const text of textsFor(size)) {
      // content.width = Σ grid advances, rounded up by < 0.01pt → k/8 + [0, 0.01)
      const eighths = lay('Roboto', text, size, undefined, { textBoxPadding: 0 }).content.width * 8;
      expect(eighths - Math.floor(eighths + 1e-9)).toBeLessThan(0.09);
    }
  });
});

describe('stress.json (the deck\'s expected widths) still matches the engine', () => {
  const file = resolve(dirname(fileURLToPath(import.meta.url)), '../../../scripts/office-metrics/stress.json');
  test('every regular Roboto cell', () => {
    if (!existsSync(file)) return; // the deck is a repo artefact; no-op in a partial checkout
    const cells = (JSON.parse(readFileSync(file, 'utf8')).cells as any[]).filter((c) => c.font === 'Roboto' && c.style === 'regular');
    expect(cells.length).toBeGreaterThan(50);
    for (const c of cells) {
      const w = lay('Roboto', c.text, c.sizePt).textBox.width;
      expect(Math.abs(w - c.widthPt)).toBeLessThan(0.011);
      expect(lay('Roboto', c.text, c.sizePt, c.widthPt).lines.length).toBe(c.expectedLines);
    }
  });
});

describe('Arial (kern table): kerned from 12pt, box still holds the text', () => {
  const hasArial = () => fontMetricsProvider.getRegisteredFamilies().includes('Arial');

  test.each([9, 11, 12, 16, 36, 72])('%ipt', (size) => {
    if (!hasArial()) return; // CI (ubuntu) ships no Arial
    for (const text of ['Ta yo', 'AV yo', 'To Ta']) {
      const rep = lay('Arial', text, size);
      const boxed = lay('Arial', text, size, rep.textBox.width);
      expect(boxed.lines.length).toBe(1);
      expect(boxed.overflow.horizontal).toBe(false);
      const unkerned = lay('Arial', text, size, undefined, { shaping: false }).textBox.width;
      if (size >= 12) expect(rep.textBox.width).toBeLessThan(unkerned - 0.5);
      else expect(rep.textBox.width).toBeCloseTo(unkerned, 2);
    }
  });
});

// Longer business-style phrases accumulate up to ~9 kern-pair rounding
// discrepancies (±1/32pt each). These were the critical cases that drove the
// OFFICE_TEXTBOX_PADDING increase from 0.01cm to 1pt.
describe('Arial (kern table): long phrases, single line at textBox.width, slack ≥ 0.1pt', () => {
  const hasArial = () => fontMetricsProvider.getRegisteredFamilies().includes('Arial');
  const LONG_PHRASES = [
    // original set — worst-case phrases that nearly exhausted the old 0.2835pt budget
    'Department headcount and budget',
    'Market share analysis by region',
    'Employee engagement and retention',
    'Cost reduction achieved this period',
    'Sustainability and ESG metrics',
    'Strategic objectives and milestones',
    'Digital transformation initiatives',
    'Performance metrics for the current quarter',
    // kern-dense phrases: T+o, V+a, A+c, T+a, W+a cap pairs
    'Total Value Achievement Target',
    'Year-To-Date Growth Trajectory',
    'Quarterly Revenue Targets Achieved',
    'Wave Technology Avatar Platform',
    // financial / data labels with numbers
    'Q4 2024: Revenue vs. Target +12.3%',
    'EBITDA Margin: 23.4% (FY2025)',
    'Total Assets vs. Prior Year: +8.7%',
  ];

  test.each([9, 10, 12, 14, 16])('%ipt: textBox fits and slack ≥ 0.1pt', (size) => {
    if (!hasArial()) return;
    for (const text of LONG_PHRASES) {
      const rep = lay('Arial', text, size);
      const exact = lay('Arial', text, size, undefined, { textBoxPadding: 0 });
      const boxed = lay('Arial', text, size, rep.textBox.width);
      expect(boxed.lines.length).toBe(1);
      expect(boxed.overflow.horizontal).toBe(false);
      const slack = rep.textBox.width - exact.content.width;
      expect(slack).toBeGreaterThanOrEqual(0.1);
    }
  });
});

// TypeDrawers-style isolation: N TA pairs surrounded by neutral HH buffers.
// HH contributes no kerning, so ALL width variance = kern-snap residual of N pairs.
// At n=9 the OLD 0.2835pt budget was nearly exhausted; 1pt must leave ≥ 0.1pt slack.
describe('Arial (kern table): N isolated kern pairs — accumulation stays within padding', () => {
  const hasArial = () => fontMetricsProvider.getRegisteredFamilies().includes('Arial');

  test.each([1, 3, 5, 7, 9, 12, 16])('%i TA pairs at 14pt: fits and slack ≥ 0.1pt', (n) => {
    if (!hasArial()) return;
    const text = 'HH ' + Array.from({ length: n }, () => 'TA').join(' HH ') + ' HH';
    const rep = lay('Arial', text, 14);
    const exact = lay('Arial', text, 14, undefined, { textBoxPadding: 0 });
    expect(lay('Arial', text, 14, rep.textBox.width).lines.length).toBe(1);
    expect(rep.textBox.width - exact.content.width).toBeGreaterThanOrEqual(0.1);
  });
});

describe('Roboto: XML-sensitive characters and financial symbols', () => {
  const XML_STRINGS = [
    'Revenue < Target & Costs > Budget',
    '"Q4 Performance" & "Outlook 2025"',
    'Price: $1,234 (10% off & more)',
    '1 < 2 & 4+1 > 3, now 20% off!',
  ];

  test.each([10, 12, 14])('%ipt: textBox fits on one line', (size) => {
    for (const text of XML_STRINGS) {
      const rep = lay('Roboto', text, size);
      expect(lay('Roboto', text, size, rep.textBox.width).lines.length).toBe(1);
    }
  });
});

describe('Roboto: long German compound words — unbreakable single word', () => {
  const GERMAN_WORDS = [
    'Donaudampfschifffahrtsgesellschaft',
    'Rechtsschutzversicherungsgesellschaft',
    'Kraftfahrzeughaftpflichtversicherung',
  ];

  test.each([10, 12, 14])('%ipt: fits at textBox.width; half-width box overflows', (size) => {
    for (const word of GERMAN_WORDS) {
      const rep = lay('Roboto', word, size);
      expect(lay('Roboto', word, size, rep.textBox.width).lines.length).toBe(1);
      const narrow = lay('Roboto', word, size, rep.textBox.width / 2);
      expect(narrow.lines.length).toBe(1);
      expect(narrow.overflow.horizontal).toBe(true);
    }
  });
});
