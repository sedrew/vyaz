# `@vyaz/converters` — HTML → Vyaz model converter

Turns a **semantic formatted-HTML fragment** (rich-text editor output, CMS
export, email bodies) into a `TextFrame` for `@vyaz/core` + `@vyaz/renderer`.

Not a web-page renderer: no box model, no CSS cascade from `<style>`/classes,
no float/flex/grid/position. `<table>` converts (grid sizing, colspan/rowspan,
header shading — see Coverage below). The converter is deliberately **lossy**
and reports everything it simplified or dropped.

## API

```ts
import { htmlToTextFrame } from '@vyaz/converters'

const { frame, inlineBoxes, warnings, dropped } = htmlToTextFrame(html, opts)
//   frame        : TextFrame            → layoutTextFrame(frame)
//   inlineBoxes  : Record<string,string>→ renderToSVG(result, { inlineBoxes })
//   warnings     : HtmlWarning[]        → simplified (unsafe a:href dropped, dl flattened…)
//   dropped      : DroppedNode[]        → removed (video, form controls, <style>…)
```

`html` accepts a `string`, a `Document`, or an `Element`. A `string` needs a DOM:
the global `DOMParser` if present, otherwise `opts.parse(html) => Document`.

### Options

| option | default | meaning |
|---|---|---|
| `width` / `wrap` / `mode` | `undefined` / `true` / `'browser'` | passed to `TextFrame` |
| `baseFont` | `{ family: 'Arial', size: 16 }` | root run style |
| `monospaceFamily` | `'monospace'` | `code` / `kbd` / `samp` / `pre` |
| `linkColor` | `'#0645ad'` | `<a>` colour (also underlined) |
| `headingScale` | `{h1:2, h2:1.5, h3:1.25, h4:1.1, h5:1, h6:0.9}` | × `baseFont.size`, + bold + spacing |
| `hardBreak` | `'newline'` | `<br>` → `\n` in one paragraph (`'paragraph'` = split) |
| `onUnsupported` | `'drop'` | `'drop'` \| `'placeholder'` \| `'throw'` |
| `resolveStyle?(el)` | — | plug your own CSS (classes / `<style>`) → `Partial<TextRun>` |
| `resolveImage?(el)` | — | `<img>` → `{ width, height, svg }` (e.g. a `<image href="data:…">`) |

## Coverage (html5-test-page as the reference)

### ✅ clean — block → Paragraph, inline → run style
`p`, `h1`–`h6`, `address`, `blockquote`, `pre`, `br`,
`strong`/`b`, `em`/`i`/`cite`/`dfn`/`var`, `ins`/`u`, `del`/`s`, `sup`, `sub`,
`small`, `mark`, `code`/`kbd`/`samp`, `q`, `abbr` (title → warning),
`a` (colour+underline, `href` carried on `TextRun.data.href` — real `<a>` in browser/preserve), `span` + inline `style=""`
(`color`, `font-*`, `text-decoration`, `text-transform`, `letter-spacing`,
`background-color`), `ul`/`ol`/`li` (nested via `level`), container elements
(`div`/`section`/`article`/…) are transparent.

### 📐 table — grid layout, rendered during conversion (T0–T5, shipped)
`table`+`thead`/`tbody`/`tfoot`/`tr`/`th`/`td`/`caption`: converts to a
`@vyaz/core` `TableFrame`, laid out and rendered to SVG *during* conversion
(not deferred), then spliced into the flow as an inline-box widget.
`colspan`/`rowspan`, header shading, `<caption>` (bold paragraph above). A
`<table>` nested inside a cell converts too, recursively — no depth cap yet
(see the core `TableLayoutEngine`'s `_depth` for the equivalent guard on the
`TableFrame`-in-`TableCell` primitive; this HTML path predates and doesn't use
it). CSS-driven column/row sizing does not convert.

### ⚠ lossy — converted with a warning
`dl`/`dt`/`dd` (dt → bold para, dd → indented para), `figure`/`figcaption`,
`details`/`summary` (flattened, static), nested lists changing type.

### 🖼 drawn into an SVG box (Phase 4)
`img` (`resolveImage` → base64 `<image>`), inline `svg` (passthrough),
`progress`, `meter`, `hr`, colour-swatch `span`. Rendered by the converter into
`inlineBoxes[id]`; `@vyaz/renderer` splices each into the box the layout reserved.

### ❌ dropped — recorded in `dropped[]`
`video`/`audio`/`iframe`/`embed`/`object`/`canvas`, form controls,
`<style>` / class CSS / `position`/`flex`/`grid`/`float`, `:hover`/animation,
`overline` / decoration style+colour / `text-shadow` / glyph stroke+gradient /
small-caps (engine ignores — SVG-only pass is a separate ROADMAP item).

Rough split: ~70% clean (tables included), ~15% drawn, ~15% dropped.

## Enabling changes in the other packages

- `@vyaz/core`: `InlineWidget.id?: string`.
- `@vyaz/renderer`: `renderToSVG(…, { inlineBoxes })` — for each inline-box span,
  splice `inlineBoxes[span.inlineWidget.id]` into a `<g>` translated to the box
  and scaled to `width × height`; otherwise draw a light placeholder rect.

## Phases

| # | scope |
|---|---|
| **0** | workspace scaffold; `InlineWidget.id`; renderer `inlineBoxes` + inline-box painting; DOM walk + block/inline split + `warnings`; minimal `p` + text |
| **1** | inline formatting tags + `style=""` declaration parser |
| **2** | block tags: `h1`–`h6` (+ heading scale), `blockquote`, `pre`, `address`, `br` |
| **3** | lists: `ul`/`ol`/`li` (+ `level`), `dl`/`dt`/`dd` |
| **4** | graphics → SVG box: `img`+`resolveImage`, inline `svg`, `progress`, `meter`, `hr`, `figure`, `details` (static) |
| **5** | drop zone: `video`/`iframe`/`canvas`/`style`/… → `dropped[]`; full html5-test-page as a coverage test — `table` was planned as a drop-zone item here but was later built instead (grid layout landed as a separate T0–T5 track once `@vyaz/core`'s `TableFrame` existed — see "table" in Coverage above) |
| **6** | docs `/converter` page (HTML code/preview tabs → live SVG, prominent Download, Debug toggle off by default); README; release `@vyaz/converters@0.1.0` *(not yet released — still 0.0.0)* |
| **7** *(separate track)* | ROADMAP "SVG-only text effects" in `@vyaz/renderer` |
