/**
 * SystemFontRegistry.ts — singleton that scans system fonts using `get-system-fonts`
 * and registers them in FontMetricsProvider for both fontkit and @napi-rs/canvas.
 *
 * Usage:
 *   import { systemFontRegistry } from './SystemFontRegistry.js';
 *   await systemFontRegistry.scan();
 *   console.log(systemFontRegistry.getRegisteredFamilies());
 *
 * ⚠️ Node.js built-in module imports are dynamic (lazy) to avoid
 * Vite/Webpack externalization errors in browser builds.
 */

import { fontMetricsProvider } from './FontMetricsProvider.js';
import { isNodeLike } from '../utils/env.js';

interface ScanResult {
  /** Total font files found on the system */
  total: number;
  /** Number of successfully registered font files */
  registered: number;
}

/**
 * Parse font subfamily name into weight/style.
 * Examples:
 *   "Regular"       → { weight: 'normal', style: 'normal' }
 *   "Bold"          → { weight: 'bold',   style: 'normal' }
 *   "Italic"        → { weight: 'normal', style: 'italic' }
 *   "Bold Italic"   → { weight: 'bold',   style: 'italic' }
 *   "Light"         → { weight: 'light',  style: 'normal' }
 *   "Medium"        → { weight: 'medium', style: 'normal' }
 *   "Semi Bold"     → { weight: 'semibold', style: 'normal' }
 *   "Black"         → { weight: 'black',   style: 'normal' }
 */
function parseSubfamily(subfamily: string): { weight: string; style: string } {
  const lower = subfamily.toLowerCase();

  let style: string;
  if (lower.includes('italic')) {
    style = 'italic';
  } else {
    style = 'normal';
  }

  let weight: string;
  if (lower.includes('thin') || lower.includes('hairline')) {
    weight = 'thin';
  } else if (lower.includes('extralight') || lower.includes('ultralight')) {
    weight = 'extralight';
  } else if (lower.includes('light')) {
    weight = 'light';
  } else if (lower.includes('semibold') || lower.includes('demibold')) {
    weight = 'semibold';
  } else if (lower.includes('bold') || lower.includes('heavy') || lower.includes('black')) {
    weight = 'bold';
  } else if (lower.includes('medium') || lower.includes('medium')) {
    weight = 'medium';
  } else {
    weight = 'normal';
  }

  return { weight, style };
}

export class SystemFontRegistry {
  private static _instance: SystemFontRegistry;

  /** Map of registered family names → true */
  private registered = new Map<string, true>();

  private constructor() {}

  static get instance(): SystemFontRegistry {
    if (!SystemFontRegistry._instance) {
      SystemFontRegistry._instance = new SystemFontRegistry();
    }
    return SystemFontRegistry._instance;
  }

  /**
   * Scan the system for all fonts and register them in FontMetricsProvider.
   *
   * - Uses `get-system-fonts` to find all .ttf/.otf files
   * - Opens each with fontkit to extract familyName/subfamilyName
   * - Registers in fontMetricsProvider (fontkit buffer + canvas path)
   *
   * @returns stats about what was found and registered
   */
  async scan(): Promise<ScanResult> {
    // System font scanning requires Node.js — no-op in browser
    if (!isNodeLike) {
      console.warn('[vyaz] systemFontRegistry.scan() недоступен в браузере');
      return { total: 0, registered: 0 };
    }

    // Dynamic imports — hidden from bundler static analysis.
    // Only resolves on Node.js.  No-op in browser.
    const [{ readFileSync }, getSystemFontsModule] = await Promise.all([
      // @ts-ignore — 'node:fs' is a Node.js built-in; not resolvable with moduleResolution:bundler.
      import('node:fs'),
      import('get-system-fonts') as any,
    ]);
    const getSystemFonts = (getSystemFontsModule.default || getSystemFontsModule) as (opts?: any) => Promise<string[]>;

    const paths: string[] = await getSystemFonts();
    let registered = 0;

    for (const fontPath of paths) {
      try {
        const buffer = readFileSync(fontPath);

        // Dynamic import — fontkit may not be available in browser
        let fontkit: any;
        try {
          fontkit = await import('fontkit');
          // @ts-ignore fontkit CJS/ESM compatibility
          fontkit = fontkit.default || fontkit;
        } catch {
          // fontkit not available — skip font registration
          continue;
        }

        const font = fontkit.create(buffer);
        const family = font.familyName;
        if (!family) continue;

        const { weight, style } = parseSubfamily(font.subfamilyName || 'Regular');

        await fontMetricsProvider.registerFont(family, { weight, style }, buffer, fontPath);
        this.registered.set(family, true);
        registered++;
      } catch {
        // Skip unreadable / invalid font files
        continue;
      }
    }

    return { total: paths.length, registered };
  }

  /**
   * Check if a font family is registered.
   */
  isRegistered(family: string): boolean {
    return this.registered.has(family);
  }

  /**
   * Get list of all registered font families.
   */
  getRegisteredFamilies(): string[] {
    return Array.from(this.registered.keys());
  }
}

/** Singleton instance */
export const systemFontRegistry = SystemFontRegistry.instance;