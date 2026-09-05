/**
 * inline.test.ts — inline formatting tags + `style=""` parsing (Phase 1).
 */
import { describe, test, expect } from 'bun:test';
import { convert, text } from './helpers.ts';

const one = (html: string) => convert(html).frame.paragraphs[0];

describe('inline formatting', () => {
  test('strong / b → bold run', () => {
    const p = one('<p>a <strong>b</strong> <b>c</b></p>');
    expect(p.children.find((r) => r.text === 'b')!.fontWeight).toBe('bold');
    expect(p.children.find((r) => r.text === 'c')!.fontWeight).toBe('bold');
  });

  test('em / i / cite → italic', () => {
    const p = one('<p><em>e</em><i>i</i><cite>c</cite></p>');
    expect(p.children.every((r) => r.fontStyle === 'italic')).toBe(true);
  });

  test('u / ins → underline, s / del → strikethrough', () => {
    const p = one('<p><u>u</u>·<ins>n</ins>·<s>s</s>·<del>d</del></p>');
    expect(p.children.find((r) => r.text === 'u')!.underline).toBe(true);
    expect(p.children.find((r) => r.text === 'n')!.underline).toBe(true);
    expect(p.children.find((r) => r.text === 's')!.strikethrough).toBe(true);
    expect(p.children.find((r) => r.text === 'd')!.strikethrough).toBe(true);
  });

  test('sup / sub → script', () => {
    const p = one('<p>x<sup>2</sup>y<sub>n</sub></p>');
    expect(p.children.find((r) => r.text === '2')!.script).toBe('super');
    expect(p.children.find((r) => r.text === 'n')!.script).toBe('sub');
  });

  test('small shrinks, mark highlights', () => {
    const p = one('<p><small>s</small><mark>m</mark></p>');
    expect(p.children.find((r) => r.text === 's')!.fontSize).toBeCloseTo(16 * 0.8, 5);
    expect(p.children.find((r) => r.text === 'm')!.backgroundColor).toBeTruthy();
  });

  test('code family is monospace', () => {
    const p = one('<p><code>f()</code></p>');
    expect(p.children[0].fontFamily).toBe('monospace');
  });

  test('nested styles compose', () => {
    const p = one('<p><strong>b<em>bi</em></strong></p>');
    const bi = p.children.find((r) => r.text === 'bi')!;
    expect(bi.fontWeight).toBe('bold');
    expect(bi.fontStyle).toBe('italic');
  });

  test('a → link colour + underline + href carried in data (no warning)', () => {
    const r = convert('<p><a href="https://x.test">link</a></p>');
    const run = r.frame.paragraphs[0].children[0];
    expect(run.color).toBe('#0645ad');
    expect(run.underline).toBe(true);
    expect(run.data).toEqual({ href: 'https://x.test' });
    expect(r.warnings.some((w) => w.code === 'link-href-lost')).toBe(false);
  });

  test('a href with a disallowed scheme is dropped, not carried, with a warning', () => {
    const r = convert('<p><a href="javascript:alert(1)">link</a></p>');
    const run = r.frame.paragraphs[0].children[0];
    expect(run.data?.href).toBeUndefined();
    expect(r.warnings.some((w) => w.code === 'link-href-unsafe')).toBe(true);
  });

  test('a href: relative paths, fragments, mailto, and tel are all carried', () => {
    const cases = ['/path', './rel', '../rel', '#section', 'mailto:a@b.com', 'tel:+123456'];
    for (const href of cases) {
      const r = convert(`<p><a href="${href}">link</a></p>`);
      const run = r.frame.paragraphs[0].children[0];
      expect(run.data?.href).toBe(href);
    }
  });

  test('q wraps in curly quotes', () => {
    expect(text(one('<p><q>hi</q></p>'))).toBe('“hi”');
  });

  test('abbr keeps text, warns about title', () => {
    const r = convert('<p><abbr title="HyperText">HTML</abbr></p>');
    expect(text(r.frame.paragraphs[0])).toBe('HTML');
    expect(r.warnings.some((w) => w.code === 'abbr-title-lost')).toBe(true);
  });
});

describe('inline style=""', () => {
  test('colour / weight / style / size / family', () => {
    const p = one('<p><span style="color:#c00;font-weight:bold;font-style:italic;font-size:20px;font-family:Georgia, serif">x</span></p>');
    const r = p.children[0];
    expect(r.color).toBe('#c00');
    expect(r.fontWeight).toBe('bold');
    expect(r.fontStyle).toBe('italic');
    expect(r.fontSize).toBe(20);
    expect(r.fontFamily).toBe('Georgia');
  });

  test('em font-size resolves against the parent run size', () => {
    // <p style="font-size:20px"> sets the block run to 20; span 1.5em → 30.
    const p = one('<p style="font-size:20px"><span style="font-size:1.5em">x</span></p>');
    expect(p.children[0].fontSize).toBeCloseTo(30, 5);
  });

  test('text-decoration underline + line-through', () => {
    const p = one('<p><span style="text-decoration:underline line-through">x</span></p>');
    expect(p.children[0].underline).toBe(true);
    expect(p.children[0].strikethrough).toBe(true);
  });

  test('letter-spacing + text-transform', () => {
    const p = one('<p><span style="letter-spacing:2px;text-transform:uppercase">x</span></p>');
    expect(p.children[0].letterSpacing).toBe(2);
    expect(p.children[0].textTransform).toBe('uppercase');
  });

  test('block text-align → paragraph alignment', () => {
    expect(one('<p style="text-align:center">x</p>').style.alignment).toBe('center');
    expect(one('<p style="text-align:justify">x</p>').style.alignment).toBe('justify');
  });

  test('resolveStyle hook wins', () => {
    const p = convert('<p><span class="hl">x</span></p>', {
      resolveStyle: (el) => (el.getAttribute('class') === 'hl' ? { color: '#0a0' } : undefined),
    }).frame.paragraphs[0];
    expect(p.children[0].color).toBe('#0a0');
  });
});
