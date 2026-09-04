/**
 * loadPlaygroundFonts.ts — shared font bootstrap for the Playground, the Cases
 * explorer and the Converter.
 *
 * Single-file, full-coverage faces bundled under ../fonts (same bytes as
 * packages/core/tests/fixtures). `registerFont` from @vyaz/renderer feeds BOTH
 * the layout engine and `document.fonts` from one call, so the emitted
 * <svg><text> can't drift from the metrics it was positioned with.
 */
import { registerFont } from '@vyaz/renderer'

import robotoUrl from '../fonts/Roboto-VariableFont_wdth,wght.ttf?url'
import interUrl from '../fonts/Inter-Variable.ttf?url'
import greatVibesUrl from '../fonts/GreatVibes-Regular.ttf?url'

const FONT_FILES: { family: string; url: string; variable: boolean }[] = [
  { family: 'Roboto', url: robotoUrl, variable: true },
  { family: 'Inter', url: interUrl, variable: true },
  { family: 'Great Vibes', url: greatVibesUrl, variable: false },
]

// Legacy / test-fixture names that appear in sample docs and in the renderer
// test cases. `Unifont` is a fixture the docs don't bundle (5 MB); the Cases
// explorer is a showcase, not a pixel-regression, so an approximate Roboto
// render is fine. CSS generics (`monospace` etc.) are deliberately NOT aliased
// — a browser ignores an @font-face named after a generic, so pages that want
// monospace pass a concrete family (see the Converter).
const ALIASES: Record<string, string> = {
  Arial: 'Roboto', Helvetica: 'Roboto', Verdana: 'Roboto',
  'Times New Roman': 'Roboto', Georgia: 'Great Vibes', Unifont: 'Roboto',
}

/** family (incl. alias) → raw bytes, kept for the self-contained SVG download */
export const fontBytes = new Map<string, Uint8Array>()

let started: Promise<void> | null = null

/** Idempotent: registers every face once, with the engine and with the browser. */
export function loadPlaygroundFonts(): Promise<void> {
  return (started ??= (async () => {
    const install = async (family: string, buf: Uint8Array, variable: boolean) => {
      fontBytes.set(family, buf)
      // One call per (weight, style) → engine + document.fonts, always in sync.
      for (const style of ['normal', 'italic'] as const) {
        await registerFont(family, buf, { weight: 400, style })
        await registerFont(family, buf, {
          weight: 700, style, ...(variable ? { variation: { wght: 700 } } : {}),
        })
      }
    }

    for (const f of FONT_FILES) {
      await install(f.family, new Uint8Array(await (await fetch(f.url)).arrayBuffer()), f.variable)
    }
    for (const [alias, target] of Object.entries(ALIASES)) {
      await install(alias, fontBytes.get(target)!, FONT_FILES.find((f) => f.family === target)!.variable)
    }
    try { await (document as any).fonts.ready } catch { /* ignore */ }
  })())
}
