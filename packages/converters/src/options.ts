/**
 * options.ts — public options for {@link htmlToTextFrame} and their defaults.
 */
import type { TextRun } from '@vyaz/core';

/** What to do with an element the converter has no mapping for. */
export type UnsupportedPolicy = 'drop' | 'placeholder' | 'throw';

/** SVG content for one inline box, sized to `width` × `height`. */
export interface ResolvedImage {
  width: number;
  height: number;
  /** SVG fragment authored at `width` × `height` (e.g. `<image href="data:…"/>`). */
  svg: string;
}

export interface HtmlConvertOptions {
  /** `TextFrame.width`. Omit for auto width. */
  width?: number;
  /** `TextFrame.wrap`. Default `true`. */
  wrap?: boolean;
  /** Metric mode passed through to the caller's `layoutTextFrame`. Informational here. */
  mode?: 'browser' | 'office';
  /** Root run style. */
  baseFont?: { family?: string; size?: number };
  /** Family for `code` / `kbd` / `samp` / `pre`. Default `'monospace'`. */
  monospaceFamily?: string;
  /** `<a>` colour (links are also underlined). Default `'#0645ad'`. */
  linkColor?: string;
  /** Per-level heading size multipliers over `baseFont.size`. */
  headingScale?: Partial<Record<'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6', number>>;
  /** `<br>` handling: `'newline'` keeps one paragraph (`\n`), `'paragraph'` splits. */
  hardBreak?: 'newline' | 'paragraph';
  /** Fallback for unmapped elements. Default `'drop'`. */
  onUnsupported?: UnsupportedPolicy;
  /** Plug your own CSS (classes / `<style>`): element → extra run style. */
  resolveStyle?: (el: Element) => Partial<TextRun> | undefined;
  /** `<img>` → inline-box content. Without it, images are dropped. */
  resolveImage?: (el: Element) => ResolvedImage | undefined;
  /** Parse an HTML string into a `Document` when no global `DOMParser` exists. */
  parse?: (html: string) => Document;
}

export interface ResolvedOptions {
  width?: number;
  wrap: boolean;
  mode?: 'browser' | 'office';
  baseFamily: string;
  baseSize: number;
  monospaceFamily: string;
  linkColor: string;
  headingScale: Record<'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6', number>;
  hardBreak: 'newline' | 'paragraph';
  onUnsupported: UnsupportedPolicy;
  resolveStyle?: (el: Element) => Partial<TextRun> | undefined;
  resolveImage?: (el: Element) => ResolvedImage | undefined;
  parse?: (html: string) => Document;
}

const DEFAULT_HEADING_SCALE = { h1: 2, h2: 1.5, h3: 1.25, h4: 1.1, h5: 1, h6: 0.9 } as const;

export function resolveOptions(o: HtmlConvertOptions = {}): ResolvedOptions {
  return {
    width: o.width,
    wrap: o.wrap ?? true,
    mode: o.mode,
    baseFamily: o.baseFont?.family ?? 'Arial',
    baseSize: o.baseFont?.size ?? 16,
    monospaceFamily: o.monospaceFamily ?? 'monospace',
    linkColor: o.linkColor ?? '#0645ad',
    headingScale: { ...DEFAULT_HEADING_SCALE, ...o.headingScale },
    hardBreak: o.hardBreak ?? 'newline',
    onUnsupported: o.onUnsupported ?? 'drop',
    resolveStyle: o.resolveStyle,
    resolveImage: o.resolveImage,
    parse: o.parse,
  };
}
