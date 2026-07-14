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

// ── Content walker (handles hardBreak → \n) ────────────────────────────

/**
 * Walk ProseMirror content nodes inside a paragraph/heading.
 * - text nodes → collect text with current marks
 * - hardBreak → append "\n" to current accumulated text
 * - Different mark sets between adjacent text nodes → create separate TextRuns
 * - Same marks → merge into one TextRun
 *
 * Tiptap's hardBreak means Shift+Enter in the editor.
 */
function collectRuns(node: PMNode): TextRun[] {
  const runs: TextRun[] = []

  if (!node.content) return runs

  let currentText = ''
  let currentMarks: PMark[] | undefined

  function flush() {
    if (currentText.length > 0) {
      runs.push(makeTextRun(currentText, currentMarks))
      currentText = ''
    }
  }

  for (const child of node.content) {
    if (child.type === 'text') {
      // Check if marks changed from previous segment
      const marksChanged = marksSignature(child.marks) !== marksSignature(currentMarks)
      if (marksChanged && currentText.length > 0) {
        flush()
      }
      currentText += child.text ?? ''
      currentMarks = child.marks
    } else if (child.type === 'hardBreak') {
      // Shift+Enter → insert \n within the same text run
      currentText += '\n'
      // marks reset after hardBreak (same line in ProseMirror)
    }
  }

  flush()
  return runs
}

/** Deterministic string key for mark array comparison. */
function marksSignature(marks: PMark[] | undefined): string {
  if (!marks || marks.length === 0) return ''
  return marks.map(m => `${m.type}:${JSON.stringify(m.attrs ?? {})}`).join('|')
}

// ── Node → Paragraph converter ─────────────────────────────────────────

function pmNodeToParagraph(node: PMNode): Paragraph | null {
  switch (node.type) {
    case 'paragraph':
    case 'heading': {
      const runs = collectRuns(node)

      if (runs.length === 0) {
        runs.push(makeTextRun(' '))
      }

      const isHeading = node.type === 'heading'
      const level = isHeading ? (node.attrs?.level as number) ?? 1 : undefined
      const headingFontSize = level ? (HEADING_SIZES_BY_LEVEL[level] ?? DEFAULT_FONT_SIZE) : undefined

      if (isHeading) {
        for (const r of runs) {
          r.fontSize = headingFontSize!
          r.fontWeight = 'bold'
        }
      }

      // Extract textAlign from node attrs (set by @tiptap/extension-text-align)
      const alignment = (node.attrs?.textAlign as TextAlignment) ?? 'left'

      return {
        style: {
          alignment,
          lineHeight: isHeading ? 1.3 : 1.4,
          spaceBefore: isHeading ? 12 : 4,
          spaceAfter: isHeading ? 6 : 8,
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