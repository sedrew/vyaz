/**
 * proseMirrorToVyaz.ts — Convert ProseMirror JSON (from Tiptap) to @vyaz/core TextFrame.
 *
 * Handles:
 *   - doc → paragraphs
 *   - text nodes → TextRun
 *   - marks: bold, italic, underline, strike, code, link
 *   - headings → fontSize bump
 *   - horizontalRule, hardBreak → placeholder
 */

import type { TextFrame, Paragraph, TextRun, TextAlignment } from '@vyaz/core'

// ── ProseMirror JSON types ─────────────────────────────────────────────

interface PMNode {
  type: string
  content?: PMNode[]
  text?: string
  marks?: PMark[]
  attrs?: Record<string, unknown>
}

interface PMark {
  type: string
  attrs?: Record<string, unknown>
}

interface PMDoc {
  type: 'doc'
  content?: PMNode[]
}

// ── Defaults ────────────────────────────────────────────────────────────

const DEFAULT_FONT_FAMILY = 'Arial'
const DEFAULT_FONT_SIZE = 16
const HEADING_SIZES: Record<string, number> = {
  heading: 24,
  heading2: 22,
  heading3: 20,
  heading4: 18,
  heading5: 16,
  heading6: 14,
}

const HEADING_SIZES_BY_LEVEL: Record<number, number> = {
  1: 28,
  2: 24,
  3: 20,
  4: 18,
  5: 16,
  6: 14,
}

// ── Mark → style helpers ───────────────────────────────────────────────

function mergeMarks(marks: PMark[] | undefined, base: Partial<TextRun>): Partial<TextRun> {
  const s: Partial<TextRun> = { ...base }

  if (!marks) return s

  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        s.fontWeight = 'bold'
        break
      case 'italic':
        s.fontStyle = 'italic'
        break
      case 'underline':
        s.underline = true
        break
      case 'strike':
        s.strikethrough = true
        break
      case 'code':
        s.fontFamily = 'monospace'
        s.backgroundColor = '#f0f0f0'
        break
      case 'link':
        // preserve color or add a link colour
        if (!s.color) s.color = '#1a73e8'
        s.underline = true
        break
      case 'subscript':
        s.script = 'sub'
        break
      case 'superscript':
        s.script = 'super'
        break
      case 'textStyle':
        // can contain fontSize, color via attrs
        if (mark.attrs) {
          if (typeof mark.attrs.fontSize === 'number') {
            s.fontSize = mark.attrs.fontSize
          }
          if (typeof mark.attrs.color === 'string') {
            s.color = mark.attrs.color
          }
        }
        break
    }
  }

  return s
}

function makeTextRun(text: string, marks?: PMark[]): TextRun {
  const style = mergeMarks(marks, {})
  return {
    type: 'text',
    text,
    fontFamily: style.fontFamily ?? DEFAULT_FONT_FAMILY,
    fontSize: style.fontSize ?? DEFAULT_FONT_SIZE,
    fontWeight: style.fontWeight ?? 'normal',
    fontStyle: style.fontStyle ?? 'normal',
    color: style.color ?? '#000000',
    underline: style.underline ?? false,
    strikethrough: style.strikethrough ?? false,
    script: style.script ?? 'normal',
    backgroundColor: style.backgroundColor,
  }
}

// ── Node → Paragraph converter ─────────────────────────────────────────

function pmNodeToParagraph(node: PMNode): Paragraph | null {
  switch (node.type) {
    case 'paragraph': {
      const runs = node.content?.filter(n => n.type === 'text').map(n =>
        makeTextRun(n.text ?? '', n.marks)
      ) ?? []

      // If no text runs, add an empty one so spacing is visible
      if (runs.length === 0) {
        runs.push(makeTextRun(' '))
      }

      return {
        style: {
          alignment: 'left',
          lineHeight: 1.4,
          spaceBefore: 4,
          spaceAfter: 8,
        },
        children: runs,
      }
    }

    case 'heading': {
      const level = (node.attrs?.level as number) ?? 1
      const fontSize = HEADING_SIZES_BY_LEVEL[level] ?? DEFAULT_FONT_SIZE
      const runs = node.content?.filter(n => n.type === 'text').map(n => {
        const run = makeTextRun(n.text ?? '', n.marks)
        run.fontSize = fontSize
        run.fontWeight = 'bold'
        return run
      }) ?? []

      if (runs.length === 0) {
        runs.push(makeTextRun(' ', []))
      }

      return {
        style: {
          alignment: 'left',
          lineHeight: 1.3,
          spaceBefore: 12,
          spaceAfter: 6,
        },
        children: runs,
      }
    }

    case 'horizontalRule': {
      return {
        style: {
          alignment: 'left',
          lineHeight: 1.2,
          spaceBefore: 8,
          spaceAfter: 8,
        },
        children: [
          {
            type: 'text',
            text: '────────────────────',
            fontFamily: DEFAULT_FONT_FAMILY,
            fontSize: 8,
            fontWeight: 'normal',
            fontStyle: 'normal',
            color: '#999999',
          },
        ],
      }
    }

    default:
      // skip unknown nodes (bulletList, listItem, etc.)
      return null
  }
}

// ── Main converter ─────────────────────────────────────────────────────

/**
 * Convert ProseMirror JSON doc to @vyaz/core TextFrame.
 */
export function proseMirrorToVyaz(
  doc: PMDoc,
  options?: {
    width?: number
    height?: number
    alignment?: TextAlignment
  },
): TextFrame {
  const paragraphs: Paragraph[] = []

  for (const node of doc.content ?? []) {
    const p = pmNodeToParagraph(node)
    if (p) {
      // Apply global alignment override
      if (options?.alignment) {
        p.style.alignment = options.alignment
      }
      paragraphs.push(p)
    }
  }

  return {
    width: options?.width ?? 600,
    height: options?.height,
    wrap: true,
    writingMode: 'horizontal-tb',
    verticalAlignment: 'top',
    paragraphs,
    padding: { top: 8, right: 12, bottom: 8, left: 12 },
  }
}