/**
 * optical-size.test.ts — `font-optical-sizing: auto` for fonts with a free `opsz` axis.
 *
 * Chrome instances a variable font's `opsz` at the used font size. Inter's axis
 * is 14–32 (default 14); at 18px Chrome measures the line below at 357.59375px
 * (`opsz` 18) where the default master gives 363.40px — so at a 360px frame the
 * browser keeps it on one line and the default-master width wrapped it.
 * Reference: headless Chromium, `<span style="font:18px Inter">`.
 */
import { describe, test, expect, beforeAll } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { layoutTextFrame, fontMetricsProvider } from '@vyaz/core';
import { makeTextFrame, registerUnifont } from './helpers.ts';
import type { Paragraph } from '../src/types/Document.js';

const TEXT = 'Модуль рыжая лиса Государство Привет';
const CHROME_18PX = 357.59375;

beforeAll(async () => {
  await registerUnifont();
  const inter = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures/Inter-Variable.ttf'));
  // no `opsz` → the axis is free and follows the font size
  await fontMetricsProvider.registerFont('InterAuto', { weight: 'normal' }, inter);
  // `opsz` pinned by the caller → never re-instanced
  await fontMetricsProvider.registerFont('InterPinned14', { weight: 'normal', variation: { opsz: 14 } }, inter);
});

const para = (family: string, fontSize = 18): Paragraph => ({
  style: { alignment: 'left', lineHeight: 1.2, spaceBefore: 0, spaceAfter: 0, whiteSpace: 'normal' },
  children: [{ type: 'text', text: TEXT, fontFamily: family, fontSize }],
});
const lay = (family: string, width: number, mode: 'browser' | 'office' = 'browser') =>
  layoutTextFrame(makeTextFrame([para(family)], { width }), { mode, shaping: true });

describe('optical sizing (opsz = font size)', () => {
  test('browser: width matches Chrome at 18px (opsz 18)', () => {
    expect(Math.abs(lay('InterAuto', 10_000).lines[0].width - CHROME_18PX)).toBeLessThan(0.05);
  });

  test('browser: fits a 360px line like Chrome (the default master wrapped)', () => {
    expect(lay('InterAuto', 360).lines).toHaveLength(1);
    expect(lay('InterPinned14', 360).lines.length).toBeGreaterThan(1);
  });

  test('an explicitly registered opsz is kept', () => {
    expect(lay('InterPinned14', 10_000).lines[0].width).toBeGreaterThan(CHROME_18PX + 5);
  });

  test('office: stays on the registered (default, opsz 14) master', () => {
    const office = lay('InterAuto', 10_000, 'office').lines[0].width;
    const browser = lay('InterAuto', 10_000).lines[0].width;
    // opsz 18 would be ~6px narrower; the default master is ~363px
    expect(office).toBeGreaterThan(browser + 4);
    expect(Math.abs(office - 363.4)).toBeLessThan(1);
  });

  test('switching browser → office → browser does not leak instances through caches', () => {
    const a = lay('InterAuto', 10_000).lines[0].width;
    lay('InterAuto', 10_000, 'office');
    const b = lay('InterAuto', 10_000).lines[0].width;
    expect(b).toBe(a);
  });
});
