/**
 * Layout utilities — wraps ParagraphLayoutEngine for the demo.
 */
import { ParagraphLayoutEngine } from '@vyaz/core';
import type { Paragraph, LineBox } from '@vyaz/core';

const engine = new ParagraphLayoutEngine();

export interface DocConfig {
  pageWidth: number;
  pageHeight: number;
  margins: { left: number; right: number; top: number; bottom: number };
}

export function layoutDocument(doc: {
  paragraphs: Paragraph[];
  config?: Partial<DocConfig>;
}): LineBox[] {
  const cfg: DocConfig = {
    pageWidth: doc.config?.pageWidth ?? 612,
    pageHeight: doc.config?.pageHeight ?? 792,
    margins: doc.config?.margins ?? { left: 72, right: 72, top: 72, bottom: 72 },
  };
  const maxWidth = cfg.pageWidth - cfg.margins.left - cfg.margins.right;
  const allLines: LineBox[] = [];
  let yOffset = cfg.margins.top;

  for (const paragraph of doc.paragraphs) {
    const result = engine.layout(paragraph, maxWidth, yOffset);
    allLines.push(...result.lines);
    if (result.lines.length > 0) {
      const last = result.lines[result.lines.length - 1];
      yOffset = last.y + last.height + (paragraph.style.spaceAfter || 0);
    } else {
      yOffset += (paragraph.style.spaceBefore || 0) + (paragraph.style.spaceAfter || 0);
    }
  }

  return allLines;
}
