/**
 * images.test.ts — <img> → inline-box widget backed by an <image> fragment.
 *
 * See src/image.ts. The renderer never sees a URL; it splices the SVG fragment
 * this module drops into `inlineBoxes[id]`, exactly like a <table>.
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fontMetricsProvider, layoutTextFrame } from '@vyaz/core';
import { renderToSVG } from '@vyaz/renderer';
import { convert, convertMd, text } from './helpers.ts';

/** A `data:` URI from raw bytes, so a sniff test controls the exact header. */
function dataUri(mime: string, bytes: number[]): string {
  return `data:${mime};base64,${btoa(String.fromCharCode(...bytes))}`;
}
/** PNG: 8-byte sig + IHDR len/type + width/height as big-endian u32. */
function pngBytes(w: number, h: number): number[] {
  return [
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    (w >>> 24) & 0xff, (w >>> 16) & 0xff, (w >>> 8) & 0xff, w & 0xff,
    (h >>> 24) & 0xff, (h >>> 16) & 0xff, (h >>> 8) & 0xff, h & 0xff,
    0x08, 0x06, 0x00, 0x00, 0x00,
  ];
}
const PNG_40x25 = dataUri('image/png', pngBytes(40, 25));

const widgetOf = (p: { children: { type?: string; inlineWidget?: unknown }[] }) =>
  p.children.find((c) => c.type === 'inline-box');

describe('<img> — dimensions', () => {
  test('width/height attributes are used verbatim', () => {
    const { frame, inlineBoxes } = convert(`<p><img src="${PNG_40x25}" width="100" height="60"></p>`);
    const w = widgetOf(frame.paragraphs[0])!;
    expect(w.inlineWidget).toMatchObject({ width: 100, height: 60 });
    expect(inlineBoxes[w.inlineWidget!.id!]).toContain('<image ');
  });

  test('a data: PNG with no attributes is sniffed for its intrinsic size', () => {
    const { frame } = convert(`<p><img src="${PNG_40x25}"></p>`);
    expect(widgetOf(frame.paragraphs[0])!.inlineWidget).toMatchObject({ width: 40, height: 25 });
  });

  test('a data: GIF is sniffed (little-endian screen size)', () => {
    const gif = dataUri('image/gif', [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x3c, 0x00, 0x1e, 0x00, 0, 0]);
    const { frame } = convert(`<p><img src="${gif}"></p>`);
    expect(widgetOf(frame.paragraphs[0])!.inlineWidget).toMatchObject({ width: 60, height: 30 });
  });

  test('a data: JPEG is sniffed from its SOF0 marker', () => {
    const jpg = dataUri('image/jpeg', [
      0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x64, 0x00, 0xc8, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    const { frame } = convert(`<p><img src="${jpg}"></p>`);
    expect(widgetOf(frame.paragraphs[0])!.inlineWidget).toMatchObject({ width: 200, height: 100 });
  });

  test('a data: SVG is sniffed from width/height, then viewBox', () => {
    const a = convert(`<p><img src="data:image/svg+xml,${encodeURIComponent('<svg width="120" height="80"></svg>')}"></p>`);
    expect(widgetOf(a.frame.paragraphs[0])!.inlineWidget).toMatchObject({ width: 120, height: 80 });
    const b = convert(`<p><img src="data:image/svg+xml,${encodeURIComponent('<svg viewBox="0 0 64 48"></svg>')}"></p>`);
    expect(widgetOf(b.frame.paragraphs[0])!.inlineWidget).toMatchObject({ width: 64, height: 48 });
  });

  test('no attributes and an unsniffable source → dropped, alt kept as text', () => {
    const { frame, warnings } = convert('<p><img src="https://ex.com/a.png" alt="a photo"></p>');
    expect(widgetOf(frame.paragraphs[0])).toBeUndefined();
    expect(text(frame.paragraphs[0])).toBe('a photo');
    expect(warnings.some((w) => w.code === 'img-no-dimensions')).toBe(true);
  });
});

describe('<img> — embed vs link policy', () => {
  const REMOTE = '<img src="https://ex.com/a.png" width="20" height="20">';

  test("default (embed) links a remote src and warns it wasn't inlined", () => {
    const { inlineBoxes, warnings } = convert(`<p>${REMOTE}</p>`);
    const frag = Object.values(inlineBoxes)[0];
    expect(frag).toContain('href="https://ex.com/a.png"');
    expect(warnings.some((w) => w.code === 'img-remote-not-embedded')).toBe(true);
  });

  test("images:'link' links a remote src with no warning", () => {
    const { inlineBoxes, warnings } = convert(`<p>${REMOTE}</p>`, { images: 'link' });
    expect(Object.values(inlineBoxes)[0]).toContain('href="https://ex.com/a.png"');
    expect(warnings.some((w) => w.code === 'img-remote-not-embedded')).toBe(false);
  });

  test("a data: source is spliced in as-is under either policy", () => {
    for (const images of ['embed', 'link'] as const) {
      const { inlineBoxes, warnings } = convert(`<p><img src="${PNG_40x25}" width="10" height="10"></p>`, { images });
      expect(Object.values(inlineBoxes)[0]).toContain(PNG_40x25);
      expect(warnings.some((w) => w.code === 'img-remote-not-embedded')).toBe(false);
    }
  });
});

describe('<img> — safety', () => {
  test('a javascript: src is dropped', () => {
    const { frame, inlineBoxes, warnings } = convert('<p><img src="javascript:alert(1)" alt="x" width="10" height="10"></p>');
    expect(Object.keys(inlineBoxes)).toHaveLength(0);
    expect(text(frame.paragraphs[0])).toBe('x');
    expect(warnings.some((w) => w.code === 'img-src-unsafe')).toBe(true);
  });

  test('a non-image data: src is dropped', () => {
    const { inlineBoxes, warnings } = convert('<p><img src="data:text/html,<b>hi</b>" width="10" height="10"></p>');
    expect(Object.keys(inlineBoxes)).toHaveLength(0);
    expect(warnings.some((w) => w.code === 'img-src-unsafe')).toBe(true);
  });

  test('the spliced href is XML-escaped', () => {
    const { inlineBoxes } = convert('<p><img src="https://ex.com/a.png?x=1&y=2" width="10" height="10"></p>', { images: 'link' });
    expect(Object.values(inlineBoxes)[0]).toContain('x=1&amp;y=2');
  });

  test('an empty src is dropped', () => {
    const { inlineBoxes, warnings } = convert('<p><img alt="" width="10" height="10"></p>');
    expect(Object.keys(inlineBoxes)).toHaveLength(0);
    expect(warnings.some((w) => w.code === 'img-no-src')).toBe(true);
  });
});

describe('<img> — resolveImage override', () => {
  test('a ResolvedImage return takes the image over completely', () => {
    const { frame, inlineBoxes, warnings } = convert('<p><img src="https://ex.com/a.png"></p>', {
      resolveImage: () => ({ width: 7, height: 9, svg: '<rect width="7" height="9"/>' }),
    });
    const w = widgetOf(frame.paragraphs[0])!;
    expect(w.inlineWidget).toMatchObject({ width: 7, height: 9 });
    expect(inlineBoxes[w.inlineWidget!.id!]).toBe('<rect width="7" height="9"/>');
    expect(warnings.some((w) => w.code === 'img-remote-not-embedded')).toBe(false);
  });

  test('returning undefined falls through to the built-in policy', () => {
    const { frame } = convert(`<p><img src="${PNG_40x25}"></p>`, { resolveImage: () => undefined });
    expect(widgetOf(frame.paragraphs[0])!.inlineWidget).toMatchObject({ width: 40, height: 25 });
  });
});

describe('<img> — placement in the flow', () => {
  test('an inline <img> stays in its paragraph, between the text runs', () => {
    const { frame } = convert(`<p>before <img src="${PNG_40x25}" width="10" height="10"> after</p>`);
    expect(frame.paragraphs).toHaveLength(1);
    const kinds = frame.paragraphs[0].children.map((c) => c.type ?? 'text');
    expect(kinds).toEqual(['text', 'inline-box', 'text']);
  });

  test('a bare <img> in block flow becomes its own paragraph', () => {
    const { frame } = convert(`<div><img src="${PNG_40x25}" width="10" height="10"></div>`);
    expect(frame.paragraphs).toHaveLength(1);
    expect(widgetOf(frame.paragraphs[0])).toBeDefined();
  });

  test('a Markdown image flows through the shared HTML path', () => {
    const { frame, inlineBoxes } = convertMd(`text ![pic](${PNG_40x25}) more`);
    const w = widgetOf(frame.paragraphs[0])!;
    expect(w.inlineWidget).toMatchObject({ width: 40, height: 25 });
    expect(inlineBoxes[w.inlineWidget!.id!]).toContain('<image ');
  });
});

describe('<img> — full pipeline', () => {
  beforeAll(async () => {
    const fp = resolve(dirname(fileURLToPath(import.meta.url)), '../../core/tests/fixtures/unifont-17.0.05.otf');
    await fontMetricsProvider.registerFont('Unifont', { weight: 'normal', style: 'normal' }, readFileSync(fp));
  });

  test('converts, lays out, and the <image> fragment lands in the rendered SVG', () => {
    const { frame, inlineBoxes } = convert(
      `<p>see <img src="${PNG_40x25}" width="24" height="24"> here</p>`,
      { width: 400, baseFont: { family: 'Unifont' } },
    );
    const svg = renderToSVG(layoutTextFrame(frame), { preset: 'browser', inlineBoxes });
    expect(svg).toContain('<image ');
    expect(svg).toContain(PNG_40x25);
    expect(svg).toContain('>see<');
  });
});
