/**
 * vyaz --check CLI
 *
 * Environment diagnostics: verifies that all optional dependencies
 * (napi-rs/canvas, fontkit, pretext, get-system-fonts) are available
 * and that fontconfig is properly installed (measureText returns > 0).
 *
 * Usage:
 *   vyaz --check
 */

// ── Guards ──────────────────────────────────────────────────────────────

const _process: any =
  typeof globalThis !== 'undefined' ? (globalThis as any).process : undefined;

// ── ANSI helpers ────────────────────────────────────────────────────────

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function ok(label: string, msg: string): void {
  console.log(`  ${GREEN}✓${RESET} ${label.padEnd(20)} ${msg}`);
}

function fail(label: string, msg: string): void {
  console.log(`  ${RED}✗${RESET} ${label.padEnd(20)} ${msg}`);
}

function skip(label: string, msg: string): void {
  console.log(`  ${YELLOW}−${RESET} ${label.padEnd(20)} ${msg}`);
}

// ── Check helpers ───────────────────────────────────────────────────────

function _requireModule(name: string): any {
  let _require: ((id: string) => any) | null = null;

  if (typeof _process?.getBuiltinModule === 'function') {
    const mb = _process.getBuiltinModule('module');
    if (mb) _require = mb.createRequire(import.meta.url);
  }
  if (!_require) {
    const cjsRequire = (globalThis as any)['require'];
    if (typeof cjsRequire === 'function') _require = cjsRequire;
  }
  if (!_require) throw new Error('Cannot find require() — browser?');
  return _require(name);
}

// ── Individual checks ───────────────────────────────────────────────────

async function checkCanvasModule(): Promise<boolean> {
  try {
    const canvas = _requireModule('@napi-rs/canvas');
    if (typeof canvas.createCanvas !== 'function') {
      fail('@napi-rs/canvas', 'createCanvas is not a function');
      return false;
    }
    const c = canvas.createCanvas(10, 10);
    const ctx = c.getContext('2d');
    if (!ctx || typeof ctx.measureText !== 'function') {
      fail('@napi-rs/canvas', 'getContext or measureText unavailable');
      return false;
    }
    ok('@napi-rs/canvas', 'createCanvas + measureText work');
    return true;
  } catch (err: any) {
    fail('@napi-rs/canvas', `not available — ${err.message}`);
    return false;
  }
}

async function checkFontkitModule(): Promise<boolean> {
  try {
    const fontkit = await import('fontkit');
    const fk = (fontkit as any).default || fontkit;
    if (typeof fk.create !== 'function') {
      fail('fontkit', 'create is not a function');
      return false;
    }
    ok('fontkit', 'fontkit.create() is available');
    return true;
  } catch (err: any) {
    fail('fontkit', `not available — ${err.message}`);
    return false;
  }
}

async function checkPretextModule(): Promise<boolean> {
  try {
    const pretext = await import('@chenglou/pretext');
    const pt = (pretext as any).default || pretext;
    if (typeof pt.prepare !== 'function') {
      fail('@chenglou/pretext', 'prepare is not a function');
      return false;
    }
    ok('@chenglou/pretext', 'pretext.prepare() is available');
    return true;
  } catch (err: any) {
    fail('@chenglou/pretext', `not available — ${err.message}`);
    return false;
  }
}

async function checkMeasureText(): Promise<boolean> {
  try {
    const canvas = _requireModule('@napi-rs/canvas');
    const c = canvas.createCanvas(200, 50);
    const ctx = c.getContext('2d');
    ctx.font = '16px serif';
    const m = ctx.measureText('M');
    if (m.width > 0) {
      ok('measureText', `width = ${m.width} (> 0) — fontconfig OK`);
      return true;
    }
    fail(
      'measureText',
      `width = ${m.width} — fontconfig probably missing\n` +
        `        ${YELLOW}Solution: install fontconfig and run fc-cache -f${RESET}`,
    );
    return false;
  } catch (err: any) {
    fail('measureText', `error — ${err.message}`);
    return false;
  }
}

async function checkSystemFontsModule(): Promise<boolean> {
  try {
    const mod = await import('get-system-fonts');
    const getSystemFonts = (mod as any).default || mod;
    if (typeof getSystemFonts !== 'function') {
      skip('get-system-fonts', 'not a function (browser build?)');
      return true; // not fatal — may be browser stub
    }
    const paths: string[] = await getSystemFonts();
    ok('get-system-fonts', `${paths.length} system fonts found`);
    return true;
  } catch (err: any) {
    fail('get-system-fonts', `not available — ${err.message}`);
    return false;
  }
}

// ── Public API ──────────────────────────────────────────────────────────

export async function run(): Promise<void> {
  console.log(`${BOLD}vyaz environment check${RESET}\n`);

  const results = await Promise.all([
    checkCanvasModule(),
    checkFontkitModule(),
    checkPretextModule(),
    checkMeasureText(),
    checkSystemFontsModule(),
  ]);

  const passed = results.filter(Boolean).length;
  const total = results.length;
  const allOk = passed === total;

  console.log();
  if (allOk) {
    console.log(`  ${GREEN}${BOLD}✔ All ${total} checks passed${RESET}`);
    _process?.exit(0);
  } else {
    console.log(`  ${RED}${BOLD}✘ ${passed}/${total} checks passed${RESET}\n`);
    if (!results[3]) {
      // measureText check failed — most common issue in Docker
      console.log(
        `  ${YELLOW}Hint: measureText returned 0 — fontconfig is likely missing.${RESET}\n` +
          `  ${YELLOW}Install it with: apt-get install -y fontconfig && fc-cache -f${RESET}\n`,
      );
    }
    _process?.exit(1);
  }
}