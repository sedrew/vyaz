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
//
// Family lookup is an exact string match on both sides (engine and
// `document.fonts`), so every spelling a case can ask for needs its own entry:
// `fonts/greatvibes-ligatures` says "GreatVibes" while the bundled file is
// registered under its display name "Great Vibes", and "Arial Black" is not
// covered by the "Arial" alias. Without these two the cases silently fall
// through `onMissingFont: 'substitute'` and render as Roboto.
const ALIASES: Record<string, string> = {
  Arial: 'Roboto', Helvetica: 'Roboto', Verdana: 'Roboto',
  'Times New Roman': 'Roboto', Georgia: 'Great Vibes', Unifont: 'Roboto',
  GreatVibes: 'Great Vibes', 'Arial Black': 'Roboto',
}

/** family (incl. alias) → raw bytes, kept for the self-contained SVG download */
export const fontBytes = new Map<string, Uint8Array>()

/** Every family name the engine + `document.fonts` ended up with. */
export const registeredFamilies = new Set<string>()

const LOG = '[vyaz-docs/fonts]'

let started: Promise<void> | null = null

/** Idempotent: registers every face once, with the engine and with the browser. */
export function loadPlaygroundFonts(): Promise<void> {
  return (started ??= (async () => {
    const install = async (family: string, buf: Uint8Array, variable: boolean) => {
      fontBytes.set(family, buf)
      // One call per (weight, style) → engine + document.fonts, always in sync.
      for (const style of ['normal', 'italic'] as const) {
        for (const weight of [400, 700] as const) {
          try {
            const r = await registerFont(family, buf, {
              weight, style,
              ...(variable && weight === 700 ? { variation: { wght: 700 } } : {}),
            })
            // The engine half almost never fails; the browser half can (bad
            // bytes, no FontFace). When it does, the SVG is positioned with
            // this face but *painted* with a fallback — glyphs drift.
            if (!r.browser) {
              console.warn(
                `${LOG} "${family}" ${weight} ${style} reached the layout engine but NOT ` +
                  'document.fonts — the browser will paint a fallback face and the text will drift.',
              )
            }
          } catch (e) {
            console.error(`${LOG} could not register "${family}" ${weight} ${style}`, e)
          }
        }
      }
      registeredFamilies.add(family)
    }

    for (const f of FONT_FILES) {
      try {
        const res = await fetch(f.url)
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
        await install(f.family, new Uint8Array(await res.arrayBuffer()), f.variable)
      } catch (e) {
        console.error(`${LOG} could not fetch "${f.family}" from ${f.url} — it will be missing`, e)
      }
    }
    for (const [alias, target] of Object.entries(ALIASES)) {
      const buf = fontBytes.get(target)
      if (!buf) {
        console.error(`${LOG} alias "${alias}" → "${target}", but "${target}" never loaded`)
        continue
      }
      await install(alias, buf, FONT_FILES.find((f) => f.family === target)!.variable)
    }
    try { await (document as any).fonts.ready } catch { /* ignore */ }
    console.info(
      `${LOG} ready — ${registeredFamilies.size} families: ${[...registeredFamilies].sort().join(', ')}`,
    )
  })())
}

/** One `LayoutWarning` from `@vyaz/core` (kept structural — no type import needed). */
interface FontWarning { type: string; requested: string; used: string }

// The layout computed re-runs on every keystroke; warn once per distinct
// (type, requested, used) so the console stays readable.
const seenWarnings = new Set<string>()

/**
 * Log the engine's own font warnings. `font-missing` means nothing was
 * registered under the name a document asked for and `onMissingFont:
 * 'substitute'` silently swapped in another face — the layout is still
 * internally consistent, but it is not the font the document wanted.
 * That is exactly how `GreatVibes` rendered as Roboto for so long.
 */
export function reportFontWarnings(where: string, warnings?: readonly FontWarning[]): void {
  for (const w of warnings ?? []) {
    if (w.type !== 'font-missing' && w.type !== 'font-fallback') continue
    const key = `${where}|${w.type}|${w.requested}|${w.used}`
    if (seenWarnings.has(key)) continue
    seenWarnings.add(key)
    if (w.type === 'font-missing') {
      console.warn(
        `${LOG} ${where}: "${w.requested}" is not registered — substituted "${w.used}". ` +
          'Add it to FONT_FILES or ALIASES in loadPlaygroundFonts.ts. ' +
          `Registered: ${[...registeredFamilies].sort().join(', ')}`,
      )
    } else {
      console.warn(`${LOG} ${where}: "${w.requested}" unavailable — fell back to "${w.used}".`)
    }
  }
}
