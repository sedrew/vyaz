/**
 * Shared copy + example markup for the four SVG renderer presets.
 * Consumed by <PresetLegend> (the reference block on /guide/render) and
 * <PresetTip> (the hover card on the playground toolbar).
 *
 * The snippets are the real `renderToSVG` output for the two runs
 * "Regular " + "Bold" (Inter 28) — see
 * packages/renderers/tests/cases/fonts/inter-weights/*.svg.
 */

/** One coloured token in an example line. `k` omitted = plain code. */
export interface Tok {
  k?: 'punct' | 'dim' | 'hl' | 'cmt'
  v: string
}

export interface PresetInfo {
  name: string
  /** short structure tag shown next to the name */
  struct: string
  /** 1–4 — how much of the final layout is baked into the markup */
  baked: number
  /** one-sentence definition */
  desc: string
  /** label for the arrow that points at the highlighted attribute */
  callout: string
  /** each inner array is one source line */
  snippet: Tok[][]
}

export const PRESET_ORDER = ['flat', 'browser', 'preserve', 'glyph'] as const
export type PresetName = (typeof PRESET_ORDER)[number]

const P = (v: string): Tok => ({ k: 'punct', v })
const D = (v: string): Tok => ({ k: 'dim', v })
const H = (v: string): Tok => ({ k: 'hl', v })
const C = (v: string): Tok => ({ k: 'cmt', v })
const T = (v: string): Tok => ({ v })

export const PRESET_INFO: Record<PresetName, PresetInfo> = {
  flat: {
    name: 'flat',
    struct: 'flat · no tspan',
    baked: 1,
    desc:
      'Every run is a single flat <text> element — no <tspan>, no nesting. Smallest output. ' +
      'Word origins come from the x on each <text>; the glyphs inside flow on the viewer’s own text engine.',
    callout: 'two <text> nodes, nothing nested',
    snippet: [
      [H('<text'), T(' x="0" y="27"'), H('>'), T('Regular '), P('</'), T('text'), P('>')],
      [H('<text'), T(' x="107" y="27" '), D('font-weight'), T('="700"'), H('>'), T('Bold'), P('</'), T('text'), P('>')],
    ],
  },
  browser: {
    name: 'browser',
    struct: 'expanded · no textLength',
    baked: 2,
    desc:
      'One <tspan> per styled run, each carrying its own x and style attributes; whitespace becomes ' +
      'its own <tspan>. Mirrors how a browser walks inline runs — the format to inspect or hand-edit.',
    callout: 'x on every run; spaces split out',
    snippet: [
      [P('<'), T('text '), D('xml:space'), P('='), T('"preserve"'), P('>')],
      [T('  '), P('<'), T('tspan '), H('x="0"'), P('>'), T('Regular'), P('</'), T('tspan'), P('>')],
      [T('  '), P('<'), T('tspan '), H('x="99.81"'), P('>'), T(' '), P('</'), T('tspan'), P('>'), T('   '), C('← the space')],
    ],
  },
  preserve: {
    name: 'preserve',
    struct: 'expanded · textLength',
    baked: 3,
    desc:
      'Same structure as browser, plus textLength on every fragment. The viewer stretches each ' +
      'fragment to the width Vyaz measured, so the line stays put even when the real font is missing.',
    callout: 'textLength pins each fragment’s width',
    snippet: [
      [P('<'), T('tspan x="0" '), H('textLength="99.81"'), P('>'), T('Regular'), P('</'), T('tspan'), P('>')],
      [P('<'), T('tspan x="99.81" '), H('textLength="7.38"'), P('>'), T(' '), P('</'), T('tspan'), P('>')],
    ],
  },
  glyph: {
    name: 'glyph',
    struct: 'glyph · per-char x',
    baked: 4,
    desc:
      'One x coordinate per glyph. The whole layout is baked into the markup — it renders identically ' +
      'anywhere, with no shaping at render time. Largest output.',
    callout: 'one x value per character',
    snippet: [
      [P('<'), T('tspan '), H('x="0 18 34.2 51.2 67.6 74.3 89.9"'), P('>'), T('Regular'), P('</'), T('tspan'), P('>')],
      [P('<'), T('tspan '), H('x="108 126.5 143.6 151.1"'), P('>'), T('Bold'), P('</'), T('tspan'), P('>')],
    ],
  },
}
