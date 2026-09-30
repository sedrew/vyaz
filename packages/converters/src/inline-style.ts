/**
 * inline-style.ts — a tiny `style=""` declaration parser.
 *
 * Handles the run-level typographic properties Vyaz can represent, plus
 * `text-align`. No selectors, no cascade, no `calc()` — that's `resolveStyle`'s
 * job. Lengths: `px` and `pt` absolute; `em` / `%` relative to `parentSize`.
 */
import type { TextRun, TextAlignment } from '@vyaz/core';

export interface ParsedInlineStyle {
  run: Partial<TextRun>;
  align?: TextAlignment;
}

function parseLen(v: string, parentSize: number): number | undefined {
  const m = /^(-?[\d.]+)\s*(px|pt|em|rem|%)?$/.exec(v.trim());
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  switch (m[2]) {
    case 'pt': return (n * 96) / 72;
    case 'em': case 'rem': return n * parentSize;
    case '%': return (n / 100) * parentSize;
    default: return n; // px or unitless
  }
}

function splitDecls(cssText: string): [string, string][] {
  const out: [string, string][] = [];
  for (const chunk of cssText.split(';')) {
    const i = chunk.indexOf(':');
    if (i === -1) continue;
    const prop = chunk.slice(0, i).trim().toLowerCase();
    const val = chunk.slice(i + 1).trim();
    if (prop && val) out.push([prop, val]);
  }
  return out;
}

/**
 * A CSS colour that is only a colour — `#hex`, a keyword, `rgb()/rgba()/hsl()/hsla()` —
 * else `undefined`. The value ends up in an SVG attribute / `style` string, so
 * anything that could carry more (quotes, `;`, `url()`, `var()`) is dropped here
 * rather than trusted; the renderer escapes and re-validates it as well.
 */
function plainColor(raw: string): string | undefined {
  const c = raw.trim();
  return /^(?:#[0-9a-f]{3,8}|[a-z]{3,30}|(?:rgb|hsl)a?\(\s*[-+0-9.%,\s/a-z]*\))$/i.test(c) ? c : undefined;
}

export function parseInlineStyle(cssText: string, parentSize: number): ParsedInlineStyle {
  const run: Partial<TextRun> = {};
  let align: TextAlignment | undefined;

  for (const [prop, raw] of splitDecls(cssText)) {
    const v = raw.toLowerCase();
    switch (prop) {
      case 'color': {
        const c = plainColor(raw);
        if (c) run.color = c;
        break;
      }
      case 'background-color': {
        const c = plainColor(raw);
        if (c) run.backgroundColor = c;
        break;
      }
      case 'background': {
        // only a bare colour keyword/hex/rgb() — ignore shorthands with images
        const c = plainColor(raw);
        if (c) run.backgroundColor = c;
        break;
      }
      case 'font-weight':
        run.fontWeight = v === 'bold' || v === 'bolder' ? 'bold'
          : v === 'normal' || v === 'lighter' ? 'normal'
          : /^\d+$/.test(v) ? Number(v) : run.fontWeight;
        break;
      case 'font-style':
        if (v === 'italic' || v === 'oblique') run.fontStyle = 'italic';
        else if (v === 'normal') run.fontStyle = 'normal';
        break;
      case 'font-size': {
        const s = parseLen(v, parentSize);
        if (s !== undefined) run.fontSize = s;
        break;
      }
      case 'font-family': {
        const first = raw.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '');
        if (first) run.fontFamily = first;
        break;
      }
      case 'text-decoration':
      case 'text-decoration-line':
        if (/\bunderline\b/.test(v)) run.underline = true;
        if (/\bline-through\b/.test(v)) run.strikethrough = true;
        if (v === 'none') { run.underline = false; run.strikethrough = false; }
        break;
      case 'text-transform':
        if (v === 'uppercase' || v === 'lowercase' || v === 'capitalize' || v === 'none') {
          run.textTransform = v;
        }
        break;
      case 'letter-spacing': {
        if (v === 'normal') { run.letterSpacing = 0; break; }
        const ls = parseLen(v, parentSize);
        if (ls !== undefined) run.letterSpacing = ls;
        break;
      }
      case 'vertical-align':
        if (v === 'super') run.script = 'super';
        else if (v === 'sub') run.script = 'sub';
        break;
      case 'text-align':
        if (v === 'left' || v === 'right' || v === 'center' || v === 'justify') align = v;
        else if (v === 'start') align = 'left';
        else if (v === 'end') align = 'right';
        break;
    }
  }

  return { run, align };
}
