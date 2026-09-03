/**
 * font-fallback.test.ts — fontFamily fallback list + onMissingFont + warnings.
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { registerUnifont, makeTextFrame } from './helpers.ts';
import { layoutTextFrame } from '../src/layout/TextFrameLayoutEngine.js';
import type { Paragraph } from '../src/types/Document.js';
import { FontNotFoundError } from '../src/measure/FontNotFoundError.js';

beforeAll(async () => {
  await registerUnifont(); // only "Unifont" is registered
});

function para(fontFamily: string | string[]): Paragraph {
  return {
    style: { alignment: 'left', lineHeight: 1.2, spaceBefore: 0, spaceAfter: 0, whiteSpace: 'normal' },
    children: [{ type: 'text', text: 'hello', fontFamily, fontSize: 16, fontWeight: 'normal', fontStyle: 'normal', color: '#000' } as any],
  };
}

describe('font fallback', () => {
  test('single registered family → no warnings', () => {
    const r = layoutTextFrame(makeTextFrame([para('Unifont')]));
    expect(r.warnings).toBeUndefined();
  });

  test('fallback list → uses first registered, records font-fallback', () => {
    const r = layoutTextFrame(makeTextFrame([para(['Helvetica', 'NopeSans', 'Unifont'])]));
    expect(r.warnings).toEqual([
      { type: 'font-fallback', requested: 'Helvetica', used: 'Unifont', runIndex: 0 },
    ]);
    expect(r.lines[0].spans[0].style.fontFamily).toBe('Unifont');
  });

  test('none registered + onMissingFont "throw" (default) → throws', () => {
    expect(() => layoutTextFrame(makeTextFrame([para(['A', 'B'])]))).toThrow(FontNotFoundError);
  });

  test('none registered + onMissingFont "substitute" → font-missing warning, no throw', () => {
    const r = layoutTextFrame(makeTextFrame([para(['A', 'B'])]), { onMissingFont: 'substitute' });
    expect(r.warnings).toEqual([
      { type: 'font-missing', requested: 'A', used: 'Unifont', runIndex: 0 },
    ]);
    expect(r.lines[0].spans[0].style.fontFamily).toBe('Unifont');
  });
});
