/**
 * Font registration tests for browser environment.
 * Runs in Vite dev server alongside the Vue demo app.
 * Open http://localhost:5173/test-font-registration.html
 */
import {
  fontMetricsProvider,
  FontMetricsProvider,
  getFontBuffer,
} from '@vyaz/core';

interface TestResult {
  name: string;
  pass: boolean;
  detail?: string;
}

const out = document.getElementById('output')!;
const results: TestResult[] = [];

function log(name: string, pass: boolean, detail?: string) {
  results.push({ name, pass, detail });
  const text = `${pass ? '✓' : '✗'} ${name}\n`;
  out.textContent += text;
  if (detail) {
    out.textContent += `  ${detail}\n`;
  }
}

async function run() {
  out.textContent = 'Running tests...\n\n';

  // ── Test 1: registerFont method exists ─────────────────────────────────

  try {
    const mp = new FontMetricsProvider();
    log('registerFont method exists', typeof mp.registerFont === 'function', `type=${typeof mp.registerFont}`);
  } catch (e: any) {
    log('registerFont method exists', false, e.message);
  }

  // ── Test 2: getMetrics with Canvas fallback (system fonts) ────────────

  try {
    fontMetricsProvider.setMode('browser');
    const metrics = fontMetricsProvider.getMetrics('Arial', 16);
    log(
      'getMetrics (Arial, 16, Canvas fallback)',
      true,
      `ascent=${metrics.ascent.toFixed(2)}, descent=${metrics.descent.toFixed(2)}, source=${metrics.sourceTable}`,
    );
  } catch (e: any) {
    log('getMetrics (Arial, 16, Canvas fallback)', false, e.message);
  }

  // ── Test 3: getMetrics scales correctly with fontSize ─────────────────

  try {
    const m12 = fontMetricsProvider.getMetrics('Arial', 12);
    const m24 = fontMetricsProvider.getMetrics('Arial', 24);
    const ratio = m24.ascent / m12.ascent;
    log(
      'getMetrics scales correctly with fontSize',
      Math.abs(ratio - 2) < 0.1,
      `12px ascent=${m12.ascent.toFixed(2)}, 24px ascent=${m24.ascent.toFixed(2)}, ratio=${ratio.toFixed(2)}`,
    );
  } catch (e: any) {
    log('getMetrics scales correctly with fontSize', false, e.message);
  }

  // ── Test 4: getMetrics with bold/italic ───────────────────────────────

  try {
    const normal = fontMetricsProvider.getMetrics('Arial', 16, '400', 'normal');
    const bold = fontMetricsProvider.getMetrics('Arial', 16, '700', 'normal');
    log(
      'getMetrics with different weights (Canvas)',
      bold.ascent > 0,
      `normal ascent=${normal.ascent.toFixed(2)}, bold ascent=${bold.ascent.toFixed(2)}`,
    );
  } catch (e: any) {
    log('getMetrics with different weights (Canvas)', false, e.message);
  }

  // ── Test 5: compileParagraph ──────────────────────────────────────────

  try {
    const { compileParagraph, DEFAULT_PARAGRAPH_STYLE } = await import('@vyaz/core');
    const items = compileParagraph({
      style: { ...DEFAULT_PARAGRAPH_STYLE },
      children: [{
        text: 'Hello World',
        fontFamily: 'Arial',
        fontSize: 16,
        fontWeight: '400',
        fontStyle: 'normal',
        color: '#000',
      } as any],
    });
    log(
      'compileParagraph produces items',
      items.length > 0 && items[0].text === 'Hello World',
      `items=${items.length}, first text="${items[0].text}"`,
    );
  } catch (e: any) {
    log('compileParagraph produces items', false, e.message);
  }

  // ── Test 6: Browser API exports ───────────────────────────────────────

  try {
    const mod = await import('@vyaz/core');
    const apiList = ['ParagraphLayoutEngine', 'paragraphLayoutEngine', 'compileParagraph',
      'getParagraphText', 'makeFontToken', 'FontMetricsProvider', 'fontMetricsProvider',
      'getFontBuffer', 'FontNotFoundError', 'layoutTextFrame', 'positionLines',
      'DEFAULT_PARAGRAPH_STYLE', 'DEFAULT_TEXT_STYLE'];
    const available = apiList.filter(name => typeof (mod as any)[name] !== 'undefined');
    log(
      'Browser API exports all expected symbols',
      available.length === apiList.length,
      `available=${available.length}/${apiList.length}`,
    );
  } catch (e: any) {
    log('Browser API exports all expected symbols', false, e.message);
  }

  // ── Test 7: getFontBuffer (fetch .woff2 font) ─────────────────────────

  try {
    const buf = await getFontBuffer(
      'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2',
    );
    log(
      'getFontBuffer (fetch font by URL)',
      buf.byteLength > 0,
      `Size: ${buf.byteLength} bytes`,
    );
  } catch (e: any) {
    log('getFontBuffer (fetch font by URL)', false, `Fetch error: ${e.message}`);
  }

  // ── Summary ────────────────────────────────────────────────────────────

  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  out.textContent += `\n─── Results: ${passed}/${total} passed ───\n`;
}

run().catch((e) => {
  out.textContent += `\nFATAL: ${e.message}\n`;
});