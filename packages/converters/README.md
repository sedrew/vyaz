# @vyaz/converters

Convert a **formatted-HTML fragment** (or **Markdown**) into a
[`@vyaz/core`](../core) `TextFrame`.

Rich-text editor output, CMS bodies, email HTML → positioned lines → SVG. It is a
*text importer*, **not a web-page renderer**: no box model, no CSS cascade from
`<style>`/classes. Every simplification and every dropped element is reported.

```bash
bun add @vyaz/converters @vyaz/core @vyaz/renderer
```

```ts
import { htmlToTextFrame } from '@vyaz/converters'
import { layoutTextFrame } from '@vyaz/core'
import { renderToSVG } from '@vyaz/renderer'

const { frame, inlineBoxes, warnings, dropped } = htmlToTextFrame(html, { width: 600 })

const svg = renderToSVG(layoutTextFrame(frame), { preset: 'browser', inlineBoxes })
```

`html` may be a **string**, a `Document`, or an `Element`. A string needs a DOM:
the global `DOMParser` (browsers), otherwise pass `options.parse`:

```ts
import { parseHTML } from 'linkedom'
htmlToTextFrame(html, { parse: (h) => parseHTML(`<!doctype html><html><body>${h}</body></html>`).document })
```

## Options

| option | default | |
|---|---|---|
| `width` / `wrap` / `mode` | – / `true` / `'browser'` | forwarded to `TextFrame` |
| `baseFont` | `{ family: 'Arial', size: 16 }` | root run style |
| `monospaceFamily` | `'monospace'` | `code` / `kbd` / `samp` / `pre` |
| `linkColor` | `'#0645ad'` | `<a>` colour (also underlined) |
| `headingScale` | `{h1:2,h2:1.5,h3:1.25,h4:1.1,h5:1,h6:0.9}` | × `baseFont.size`, + bold + spacing |
| `hardBreak` | `'newline'` | `<br>` → `\n` in one paragraph (`'paragraph'` = split, not yet implemented) |
| `onUnsupported` | `'drop'` | `'drop'` \| `'placeholder'` \| `'throw'` |
| `images` | `'embed'` | built-in `<img>` encoding — `'embed'` (self-contained) \| `'link'` (`<image href="src">` verbatim). See **Images** below |
| `resolveStyle(el)` | – | your own CSS (classes / `<style>`) → `Partial<TextRun>` |
| `resolveImage(el)` | – | `<img>` takeover, checked before `images` → `{ width, height, svg }`, or `undefined` to fall through |
| `parse(html)` | – | HTML-string parser when there is no `DOMParser` |

### Fonts must line up with the paint target

Every family name the converter emits (`baseFont.family`, `monospaceFamily`,
anything from `style="font-family:…"`) must be registered with
`fontMetricsProvider` **and** resolve to the *same* font wherever the SVG is
finally painted. The CSS generics (`monospace`, `serif`, `sans-serif`) are a
trap: a browser paints `<text font-family="monospace">` with the OS mono font
regardless of any `@font-face`, so if the engine measured it as something else,
following runs drift. Point `monospaceFamily` at a concrete family you control.

## Coverage

**Clean:** `p`, `h1`–`h6`, `blockquote`, `pre`, `address`, `br`, **`img`**, `strong`/`b`,
`em`/`i`/`cite`/`dfn`/`var`, `ins`/`u`, `del`/`s`, `sup`, `sub`, `small`, `mark`,
`code`/`kbd`/`samp`, `q`, `abbr`, **`a`** (colour + underline + `href`, kept as
real data — see below), `span` + inline `style=""` (`color`, `font-*`,
`text-decoration`, `text-transform`, `letter-spacing`, `background-color`,
`text-align`, `vertical-align`), **`table`** (`colspan`/`rowspan`,
`<caption>`, header shading — see below). `div`/`section`/… are transparent.

**Lossy (with a warning):** `dl`/`dt`/`dd`, `figcaption`, `details`/`summary`,
`a` href with a disallowed scheme (`javascript:`, `data:`, …) dropped, `abbr`
title (lost).

### Links

`<a href="…">` keeps its `href` — carried on `TextRun.data.href` (a small,
open-ended metadata bag the layout engine itself never interprets — see
`@vyaz/core`'s `TextRun.data`). `@vyaz/renderer`'s `browser`/`preserve`
presets wrap the run's painted output in a real `<a href="…">`, clickable
when the SVG is inlined directly in an HTML page (not via `<img src>` or a
data-URI — SVG rendered that way paints links but they aren't interactive).
`flat`/`glyph` ignore it entirely. Only `http:`/`https:`/`mailto:`/`tel:`
schemes and relative/fragment URLs are carried through; anything else
(`javascript:`, `data:`, …) is dropped with a `link-href-unsafe` warning —
this is untrusted input by design, and an SVG `<a href="javascript:…">` is a
known XSS vector.

**Dropped (recorded in `dropped[]`):** `video`/`audio`/`iframe`/`canvas`, form
controls, `<style>`/class CSS, and — for now — `svg`/`progress`/`meter`/`hr`
(arrive in Phase 4 as `inlineBoxes`).

### Images

`<img>` becomes an inline-box widget: the layout reserves a `width` × `height`
box and `@vyaz/renderer` splices an `<image>` fragment (from `inlineBoxes[id]`)
into it — same mechanism as `table`.

- **`resolveImage(el)`** runs first. Return `{ width, height, svg }` to own the
  image outright (e.g. fetch the bytes yourself and hand back a `data:` URI);
  return `undefined` to fall through to the built-in handler.
- **`images: 'embed'`** (default) aims for a self-contained SVG. A `data:` src is
  spliced in as-is. A remote src *can't* be fetched synchronously here, so it is
  linked (`<image href="…">`) and an `img-remote-not-embedded` warning is
  emitted — pre-resolve it in `resolveImage` to truly inline the bytes.
- **`images: 'link'`** emits `<image href="src">` verbatim for every source, no
  warning.
- **Size** comes from the `width`/`height` attributes; with neither, a `data:`
  image is sniffed (PNG / GIF / JPEG / SVG). If no size can be found the image
  is dropped and its `alt` text kept as a plain run.
- **Unsafe** `src` schemes — `javascript:`, non-image `data:`, `blob:` — are
  dropped with an `img-src-unsafe` warning (untrusted input; an
  `<image href="javascript:…">` in SVG is an XSS vector).

### Tables

`<table>` converts to a `@vyaz/core` `TableFrame` and is laid out + rendered
to SVG *during* conversion (not deferred like the rest of the document), then
spliced into the surrounding text flow as an inline-box widget — the same
mechanism `img` uses (and `svg` will, once Phase 4 finishes). `<thead>`/`<tbody>`/
`<tfoot>` collapse to rows; `<th>` cells get header shading; `colspan`/
`rowspan` map to `TableCell.colSpan`/`rowSpan`; `<caption>` becomes a bold
paragraph above the table. A `<table>` nested inside a cell converts too
(recursively, through the same inline-box path); CSS-driven column/row sizing
does not convert. See [`@vyaz/core`'s Tables guide](https://sedrew.github.io/vyaz/guide/tables)
for what the underlying `TableFrame` grid supports beyond what HTML maps to.

Full plan and phase list: [`PLAN.md`](./PLAN.md).

## Markdown

`markdownToTextFrame(markdown, options)` — same result shape as
`htmlToTextFrame`, same `options` (plus one `markdown: { gfm?, breaks? }`
sub-object). It parses Markdown to an HTML string with
[`marked`](https://www.npmjs.com/package/marked) (CommonMark + GFM by
default — tables, strikethrough, task lists, autolinks) and hands that
string to `htmlToTextFrame`. No separate walker: every HTML feature above
(tables, links, formatting) works here for free, and stays in sync as the
HTML side grows.

```ts
import { markdownToTextFrame } from '@vyaz/converters'

const { frame, inlineBoxes } = markdownToTextFrame(`
# Report

A paragraph with **bold** and a [link](https://example.com).

| Metric | Value |
|---|---|
| Uptime | 99.9% |
`, { width: 600 })
```

Raw HTML embedded in the Markdown source (CommonMark explicitly allows
this — an inline `<span style="…">`, a block-level `<table>`) converts too,
with no special handling: `marked` preserves it verbatim in its HTML output,
which then flows through `htmlToTextFrame` like any other HTML.

| option | default | |
|---|---|---|
| `markdown.gfm` | `true` | GitHub Flavored Markdown (tables, strikethrough, task lists, autolinks) |
| `markdown.breaks` | `false` | a single `\n` in a paragraph → `<br>` (GitHub-comment style) instead of a space (CommonMark default) |
