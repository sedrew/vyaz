/**
 * svg-escaping.test.ts — user data must never leave its attribute / text node.
 *
 * `serializeSvg` used to write attribute values raw (`${k}="${v}"`), so a colour
 * such as `red" onload="…` — reachable straight from HTML through
 * `@vyaz/converters` (`style="color:…"`) — became a real attribute on the
 * `<text>` element: stored XSS wherever the SVG is inlined into a page. These
 * tests assert every user-controlled string is escaped or refused, in every
 * style mode and in the table renderer.
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fontMetricsProvider, layoutTextFrame, layoutTableFrame } from '@vyaz/core';
import type { TextFrame, TableFrame } from '@vyaz/core';
import { renderToSVG } from '../src/index.ts';
import { renderTableToSVG } from '../src/TableRenderer.js';
import { convert } from '../../converters/tests/helpers.ts';
import { registerUnifont } from './helpers.ts';

const EVIL = 'red" onload="alert(document.domain)" x="';
const EVIL_FAMILY = 'Evil" onload="alert(1)';

beforeAll(async () => {
  await registerUnifont(); // first: font-fallback.test.ts substitutes the first registered font
  const roboto = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../core/tests/fixtures/Roboto-VariableFont_wdth,wght.ttf'));
  await fontMetricsProvider.registerFont('Roboto', { weight: 'normal' }, roboto);
  await fontMetricsProvider.registerFont(EVIL_FAMILY, { weight: 'normal' }, roboto);
});

const frame = (run: Record<string, unknown>): TextFrame => ({
  width: 300,
  wrap: true,
  paragraphs: [{
    style: { alignment: 'left', lineHeight: 1.4, spaceBefore: 0, spaceAfter: 0 },
    children: [{ type: 'text', text: 'hi', fontFamily: 'Roboto', fontSize: 16, ...run } as any],
  }],
});

/**
 * True when any tag carries an `on…` attribute (or `style`/`href` fed a script) —
 * i.e. user data escaped its quotes. Reads real attribute *names*: text such as
 * `onload=` inside a quoted value is harmless and must not count.
 */
const injected = (svg: string) =>
  [...svg.matchAll(/<[a-zA-Z][^>]*>/g)].some((m) => {
    const names = [...m[0].replace(/="[^"]*"/g, '="').matchAll(/\s([^\s="<>\/]+)=/g)].map((x) => x[1]);
    return names.some((n) => /^on/i.test(n));
  });

const PRESETS = ['flat', 'browser', 'preserve', 'glyph'] as const;
const STYLES = ['xml', 'css'] as const;

describe('attribute injection', () => {
  for (const preset of PRESETS) for (const style of STYLES) {
    test(`color / backgroundColor / fontFamily — ${preset} / ${style}`, () => {
      const f = frame({ color: EVIL, backgroundColor: EVIL, underline: true });
      const svg = renderToSVG(layoutTextFrame(f, { glyphAdvances: preset === 'glyph' }), { preset, style, sizing: 'content' });
      expect(injected(svg)).toBe(false);

      const fam = renderToSVG(layoutTextFrame(frame({ fontFamily: EVIL_FAMILY })), { preset, style, sizing: 'content' });
      expect(injected(fam)).toBe(false);
    });
  }

  test('an invalid colour falls back to black instead of being written', () => {
    const svg = renderToSVG(layoutTextFrame(frame({ color: EVIL })), { preset: 'browser', sizing: 'content' });
    expect(svg).toContain('fill="#000000"');
    expect(svg).not.toContain('alert(');
  });

  test('CSS mode: a `;` in a colour cannot add declarations', () => {
    const svg = renderToSVG(layoutTextFrame(frame({ color: 'red; background: url(https://evil.test/x)' })), { preset: 'browser', style: 'css', sizing: 'content' });
    expect(svg).not.toContain('evil.test');
  });

  test('className is escaped', () => {
    const svg = renderToSVG(layoutTextFrame(frame({})), { preset: 'browser', sizing: 'content', className: 'x" onload="alert(1)' });
    expect(injected(svg)).toBe(false);
    expect(svg).toContain('class="x&#34; onload=&#34;alert(1)"');
  });

  test('table bgColor / border colours are escaped', () => {
    const table: TableFrame = {
      rows: [{ cells: [{ content: frame({}), style: { bgColor: EVIL } } as any], style: { bgColor: EVIL } }],
      style: { bgColor: EVIL, borderColors: EVIL, borderWidths: 1 } as any,
    };
    const svg = renderTableToSVG(layoutTableFrame(table));
    expect(injected(svg)).toBe(false);
  });

  test('legitimate colours are untouched', () => {
    for (const c of ['#f00', '#ff0000', '#ff000080', 'rebeccapurple', 'rgb(255, 0, 0)', 'rgba(0,0,0,.5)', 'hsl(120 50% 50%)']) {
      const svg = renderToSVG(layoutTextFrame(frame({ color: c })), { preset: 'browser', sizing: 'content' });
      expect(svg).toContain(`fill="${c}"`);
    }
  });
});

describe('text and href', () => {
  test('markup in text is escaped', () => {
    const svg = renderToSVG(layoutTextFrame({ ...frame({}), paragraphs: [{ ...frame({}).paragraphs[0], children: [{ type: 'text', text: '</text><script>alert(1)</script>', fontFamily: 'Roboto', fontSize: 16 } as any] }] }), { preset: 'browser', sizing: 'content' });
    expect(svg).not.toContain('<script');
  });

  test('href with a quote cannot break out of <a href>', () => {
    const svg = renderToSVG(layoutTextFrame(frame({ data: { href: 'https://x.test/" onclick="alert(1)' } })), { preset: 'browser', sizing: 'content' });
    expect(injected(svg)).toBe(false);
  });
});

describe('through @vyaz/converters (untrusted HTML)', () => {
  test('a hostile style="color:…" never reaches an attribute', () => {
    const html = `<p><span style='color:${EVIL.replace(/"/g, '&quot;')};background-color:${EVIL.replace(/"/g, '&quot;')}'>hi</span></p>`;
    const { frame: f } = convert(html, { width: 300, wrap: true, baseFont: { family: 'Roboto', size: 16 } });
    const run = f.paragraphs[0].children[0];
    expect(run.color).toBe('#000000');            // dropped at the source: stays the default
    expect(run.backgroundColor).toBeUndefined();
    const svg = renderToSVG(layoutTextFrame(f), { preset: 'browser', sizing: 'content' });
    expect(injected(svg)).toBe(false);
  });

  test('plain colours from HTML still work', () => {
    const { frame: f } = convert('<p><span style="color:#0a0;background:rgb(1, 2, 3)">hi</span></p>', { width: 300, wrap: true, baseFont: { family: 'Roboto', size: 16 } });
    const run = f.paragraphs[0].children[0];
    expect(run.color).toBe('#0a0');
    expect(run.backgroundColor).toBe('rgb(1, 2, 3)');
  });
});
