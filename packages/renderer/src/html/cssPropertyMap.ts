/**
 * cssPropertyMap.ts — Parse inline CSS style strings into `Partial<TextRun>`.
 *
 * Supports a subset of CSS properties relevant to inline text styling.
 * Unknown / unsupported properties are silently ignored.
 *
 * @see https://www.w3.org/TR/css-text-3/
 */

import type { TextRun } from '@vyaz/core';

/**
 * Parse a CSS `style` attribute value (e.g. `"color: red; font-size: 16px"`)
 * and return the corresponding `Partial<TextRun>` fields.
 */
export function parseInlineStyle(style: string | undefined): Partial<TextRun> {
  const out: Record<string, unknown> = {};

  if (!style || style.trim().length === 0) return out;

  for (const rawDecl of style.split(';')) {
    const trimmed = rawDecl.trim();
    if (!trimmed) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const prop = trimmed.slice(0, colonIdx).trim().toLowerCase();
    const value = trimmed.slice(colonIdx + 1).trim();

    if (!prop || !value) continue;

    applyProperty(out, prop, value);
  }

  return out as Partial<TextRun>;
}

/**
 * Apply a single CSS property/value to the accumulator object.
 */
function applyProperty(out: Record<string, unknown>, prop: string, value: string): void {
  switch (prop) {
    case 'color':
      out.color = value;
      break;

    case 'background-color':
    case 'background':
      // Only take simple colour values, skip complex backgrounds
      if (!value.startsWith('url(') && !value.startsWith('linear-gradient')) {
        out.backgroundColor = value;
      }
      break;

    case 'font-size': {
      const px = parseLength(value);
      if (px !== null) out.fontSize = px;
      break;
    }

    case 'font-family':
      // Strip optional quotes around the family name
      out.fontFamily = value.replace(/["']/g, '');
      break;

    case 'font-weight':
      if (value === 'bold' || value === 'bolder' || value === '700') {
        out.fontWeight = 'bold';
      } else if (value === 'normal' || value === '400') {
        out.fontWeight = 'normal';
      } else {
        const num = parseInt(value, 10);
        if (!isNaN(num) && num >= 100 && num <= 900) {
          out.fontWeight = num;
        }
      }
      break;

    case 'font-style':
      if (value === 'italic' || value === 'oblique') {
        out.fontStyle = 'italic';
      } else if (value === 'normal') {
        out.fontStyle = 'normal';
      }
      break;

    case 'text-decoration': {
      // CSS text-decoration can be a shorthand like "underline line-through"
      const parts = value.toLowerCase().split(/\s+/);
      if (parts.includes('underline')) out.underline = true;
      if (parts.includes('line-through')) out.strikethrough = true;
      if (parts.includes('overline')) out.overline = true;
      break;
    }

    case 'text-transform':
      if (['none', 'uppercase', 'lowercase', 'capitalize'].includes(value)) {
        out.textTransform = value;
      }
      break;

    case 'letter-spacing':
    case 'word-spacing': // treat word-spacing same as letter-spacing for simplicity
      {
        const px = parseLength(value);
        if (px !== null) out.letterSpacing = px;
      }
      break;

    default:
      // Unknown CSS property — skip silently
      break;
  }
}

/**
 * Parse a CSS length value (e.g. `"16px"`, `"1.2em"`, `"0"`) to px.
 *
 * Returns `null` if the value cannot be parsed.
 *
 * - `px` → direct number
 * - `pt` → pt * 1.333 (approximate)
 * - `em` / `rem` → ignored (returns null) — font-relative, can't resolve without context
 * - `%` → ignored
 * - unitless `0` → 0
 */
function parseLength(value: string): number | null {
  const trimmed = value.trim().toLowerCase();

  // Unitless zero
  if (trimmed === '0') return 0;

  // Normal / inherit / initial
  if (['normal', 'inherit', 'initial', 'unset'].includes(trimmed)) return null;

  const match = trimmed.match(/^([+-]?\d+(?:\.\d+)?)(px|pt)?$/);
  if (!match) return null;

  const num = parseFloat(match[1]);
  const unit = match[2];

  if (unit === 'pt') return Math.round(num * 1.333 * 100) / 100;
  // px or unitless (treated as px)
  return num;
}