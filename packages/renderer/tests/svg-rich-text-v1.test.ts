/**
 * svg-rich-text-v1.test.ts — Snapshot test for rich-text-v1 JSON fixture.
 *
 * Reads the fixture, runs it through layoutTextFrame → renderToSVG pipeline,
 * and matches against a file-based snapshot.
 *
 * Snapshots are stored in tests/snapshots/rich-text-v1-frame.svg
 */

import { describe, test, beforeAll } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { TextFrame } from '../../core/src/types/Document.js';
import { registerUnifont } from './helpers.ts';
import { registerArialVariants } from '../../core/tests/helpers.ts';
import { renderFrameToSVG, matchSvgSnapshot } from './helpers.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_DIR = resolve(__dirname, 'fixtures');

/**
 * Read a JSON fixture and return it as a TextFrame.
 */
function loadFixtureFrame(name: string): TextFrame {
  const path = resolve(FIXTURE_DIR, name);
  const raw = JSON.parse(readFileSync(path, 'utf-8'));
  const { description: _, ...frameData } = raw;
  return frameData as unknown as TextFrame;
}

beforeAll(async () => {
  await registerUnifont();
  await registerArialVariants();
});

describe('Rich-text-v1 fixture', () => {
  test('rich-text-v1-frame.svg: snapshot match with paragraph box debug', () => {
    const frame = loadFixtureFrame('rich-text-v1-frame.json');
    const { svg } = renderFrameToSVG(frame, {
      debug: {
        paragraphBox: true,
        widthBorder: 2,
      },
    });
    matchSvgSnapshot('rich-text-v1-frame', svg);
  });
});