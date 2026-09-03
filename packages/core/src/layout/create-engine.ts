/**
 * create-engine.ts — a layout engine you own.
 *
 * `layoutTextFrame` is a convenience wrapper over a shared default engine. When
 * you need isolation (a per-document or per-request cache), an explicit cache
 * bound, or the ability to drop the cache, create your own:
 *
 * ```ts
 * const engine = createLayoutEngine({ cache: { max: 1024 } });
 * const result = engine.layout(frame);
 * engine.clearCache();   // e.g. on document close
 * ```
 */
import type { TextFrame } from '../types/Document.js';
import { ParagraphLayoutEngine } from './ParagraphLayoutEngine.js';
import { runFlow } from './TextFrameLayoutEngine.js';
import type { LayoutOptions, TextFrameLayoutResult } from './TextFrameLayoutEngine.js';

/** Configuration for {@link createLayoutEngine}. */
export interface LayoutEngineOptions {
  /** Prepared-line cache bound (LRU entries). Default 4096. */
  cache?: { max?: number };
}

/** A layout engine with its own prepared-line cache. */
export interface LayoutEngine {
  /** Lay out a full text frame. Same result shape as {@link layoutTextFrame}. */
  layout(frame: TextFrame, options?: LayoutOptions): TextFrameLayoutResult;
  /** Drop all cached prepared-line data. */
  clearCache(): void;
}

/** Create a layout engine with an isolated, bounded prepared-line cache. */
export function createLayoutEngine(options: LayoutEngineOptions = {}): LayoutEngine {
  const pe = new ParagraphLayoutEngine(options.cache?.max);
  return {
    layout: (frame, opts = {}) => runFlow(frame, opts, pe),
    clearCache: () => pe.clearCache(),
  };
}
