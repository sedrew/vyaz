/**
 * loadPlaygroundFonts.ts — shared font bootstrap for the Playground and the
 * Cases explorer.
 *
 * Single-file, full-coverage faces bundled under ../fonts (same bytes as
 * packages/core/tests/fixtures). Two things must stay in lock-step:
 *   1. the layout engine measures with `fontMetricsProvider.registerFont`
 *   2. the browser PAINTS the emitted <svg><text> — so the same bytes must be
 *      in `document.fonts`, or glyph-mode <tspan x="…"> lands our advances
 *      under a system-font glyph and characters collide.
 */
import { fontMetricsProvider } from '@vyaz/core'

import robotoUrl from '../fonts/Roboto-VariableFont_wdth,wght.ttf?url'
import interUrl from '../fonts/Inter-Variable.ttf?url'
import greatVibesUrl from '../fonts/GreatVibes-Regular.ttf?url'

const FONT_FILES: { family: string; url: string; variable: boolean }[] = [
  { family: 'Roboto', url: robotoUrl, variable: true },
  { family: 'Inter', url: interUrl, variable: true },
  { family: 'Great Vibes', url: greatVibesUrl, variable: false },
]

// Legacy / test-fixture names that appear in sample docs and in the
// renderer test cases. `Unifont` is a fixture the docs don't bundle (5 MB);
// the Cases explorer is a showcase, not a pixel-regression, so an approximate
// Roboto render is fine.
const ALIASES: Record<string, string> = {
  Arial: 'Roboto', Helvetica: 'Roboto', Verdana: 'Roboto', monospace: 'Roboto',
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
      for (const style of ['normal', 'italic'] as const) {
        await fontMetricsProvider.registerFont(family, { weight: '400', style }, buf)
        await fontMetricsProvider.registerFont(
          family,
          { weight: '700', style, ...(variable ? { variation: { wght: 700 } } : {}) },
          buf,
        )
      }
      const weight = variable ? '1 1000' : '400'
      for (const style of ['normal', 'italic'] as const) {
        try {
          const face = new FontFace(family, buf as BufferSource, { weight, style, display: 'swap' })
          await face.load()
          ;(document as any).fonts.add(face)
        } catch { /* FontFace unsupported / bad bytes — metrics path still works */ }
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
