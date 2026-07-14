/**
 * svg-html-typography.test.ts — Snapshot test for HTML-to-SVG pipeline.
 *
 * Reads the typography-test.html fixture, parses it with htmlToTextFrame,
 * runs through layoutTextFrame → renderToSVG, and creates SVG snapshots.
 */

import { describe, test, beforeAll } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { registerUnifont, renderFrameToSVG, matchSvgSnapshot } from './helpers.ts';
import { registerArialVariants } from '../../core/tests/helpers.ts';
import { htmlToTextFrame } from '../src/html/htmlToTextFrame.js';
import { fontMetricsProvider } from '../../core/src/measure/FontMetricsProvider.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = resolve(__dirname, 'fixtures');
const CORE_FIXTURES_DIR = resolve(__dirname, '../../core/tests/fixtures');

function loadHtmlFixture(name: string): string {
  return readFileSync(resolve(FIXTURE_DIR, name), 'utf-8');
}

async function registerMonospaceFallback(): Promise<void> {
  // Register "monospace" using Unifont data so code/kbd/samp tags have metrics
  const fontPath = resolve(CORE_FIXTURES_DIR, 'unifont-17.0.05.otf');
  const data = readFileSync(fontPath);
  await fontMetricsProvider.registerFont('monospace', { weight: 'normal', style: 'normal' }, data);
  await fontMetricsProvider.registerFont('monospace', { weight: 'bold', style: 'normal' }, data);
  await fontMetricsProvider.registerFont('monospace', { weight: 'normal', style: 'italic' }, data);
}

beforeAll(async () => {
  await registerUnifont();
  await registerMonospaceFallback();
  await registerArialVariants();
});

describe('HTML typography fixture', () => {
  test('html-typography-frame.svg: full HTML fixture rendered with preset="flat"', () => {
    const html = loadHtmlFixture('typography-test.html');
    const frame = htmlToTextFrame(html, {
      width: 600,
      defaultStyle: { fontFamily: 'Unifont', fontSize: 12, color: '#000' },
    });
    const { svg } = renderFrameToSVG(frame, { preset: 'flat' });
    matchSvgSnapshot('html-typography-frame', svg);
  });

  test('html-typography-frame-debug.svg: full HTML fixture with paragraph debug boxes', () => {
    const html = loadHtmlFixture('typography-test.html');
    const frame = htmlToTextFrame(html, {
      width: 600,
      defaultStyle: { fontFamily: 'Unifont', fontSize: 12, color: '#000' },
    });
    const { svg } = renderFrameToSVG(frame, {
      debug: {
        paragraphBox: true,
        widthBorder: 1,
      },
    });
    matchSvgSnapshot('html-typography-frame-debug', svg);
  });
});