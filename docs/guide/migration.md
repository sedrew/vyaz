# Upgrading

`@vyaz/core`, `@vyaz/renderer` and `@vyaz/converters` share one version and
declare each other as peer dependencies. Upgrade all three together, to the
same version:

```bash
bun add @vyaz/core@latest @vyaz/renderer@latest @vyaz/converters@latest
```

Each section below lists what can break your code, what changes in the layout
you get back, and what to re-check. Versions are listed newest first; when you
skip several, read every section in between. The [changelog](https://github.com/sedrew/vyaz/blob/main/CHANGELOG.md)
has the full detail and the commits.

## 0.6 → 0.7

The vendored line breaker moved from `@chenglou/pretext` 0.0.8 to 1.0.0. The
public entry points are the same; one exported type lost fields, and line
breaking follows Chrome's rules, so some lines break in different places.

### Code changes

- **Peer ranges are `^0.7.0`.** A `^0.6.0` range does not include 0.7, so
  bump all three packages together.

`PreparedRichInlineItem`, the item type `compileParagraph()` returns, no longer
carries the paragraph's line-breaking options or the inline-box hints. They are
paragraph options now, or follow from the run itself:

| Removed field | Where to read it now |
|---|---|
| `overflowWrap` | `paragraph.style.overflowWrap` (default `'normal'`) |
| `whiteSpace` | `paragraph.style.whiteSpace` (`'pre'` and `'pre-wrap'` keep spaces) |
| `hyphenBreak` | `paragraph.style.hyphenBreak` (default `true`) |
| `extraWidth` | `item.metadata.inlineWidget.width` |
| `break` | an item with `metadata.inlineWidget` is an inline box, which never breaks inside |

Code that only calls `layoutTextFrame()`, `layoutTableFrame()` or the
renderers needs no change. Only code that reads the compiled items directly is
affected.

### Layout output changes

- **Line breaking follows Chrome.** Breaks come from a port of Chrome's line
  breaker and its data: CJK punctuation, quotes, dashes, URLs and Thai break
  where Chrome breaks them.
- **A paragraph's runs are one paragraph.** A word split across runs, such as
  `<b>un</b>break`, wraps as one word, and punctuation that starts a run stays
  with the word before it. 0.6 could end a line at any run boundary.
- **The same layout in every runtime.** The vendored copy no longer reads the
  user agent or `<html lang>`, so Bun, Node and every browser break lines the
  same way.
- **`wordBreak: 'keep-all'` is laid out.** Chinese, Japanese and Korean words
  stay whole. In 0.6 the option was accepted and ignored, so paragraphs that
  already set it now break differently. `'break-all'` and `'break-word'` still
  lay out as `'normal'`.
- **Kerning with the space counts when shaping is on.** Pairs such as `R W`,
  `o Y` or `А А` against a space now narrow the line, as when the run is
  shaped whole: Roboto 32 px "AVATAR Wave To Yo" measures 288.78 px instead of
  289.41 px. This applies to `shaping: true`, to the `shape` measure profile,
  and to `mode: 'office'` for fonts with a `kern` table from 12 pt.
- **An inline box is exactly its widget's width** while lines are broken. 0.6
  added a U+FFFC character to it, so a line holding a box broke as if it were
  wider.
- **Negative letter spacing:** a wrapped line no longer starts with a space.
- **Missing glyphs** measure the same whole and in pieces with shaping on.

The four golden snapshots that changed in this repository were
`fonts/roboto-kerning`, `fonts/roboto-cyrillic`, `fonts/inter-weights` and
`office-cases/letter-spacing`.

### What to re-check

- Snapshot or golden tests of your own: expect line breaks to move in CJK
  text, around punctuation, in URLs and in words split across runs, and
  widths to shrink by up to about a pixel per line with shaping on.
- Boxes sized from `content` or `textBox` with shaping on: they can come out
  slightly narrower.
- Content that sets `wordBreak: 'keep-all'`.
- Browser bundle size: the line-break tables add to it, and the core browser
  bundle is now about 980 KB.

Layout is faster on the same input and SVG rendering is about three times
faster with byte-identical output. Neither needs a change on your side; see
[Benchmark](https://github.com/sedrew/vyaz#benchmark).

## 0.5 → 0.6

### Code changes

- **Peer ranges are `^0.6.0`.** A `^0.5.0` range does not include 0.6, so
  bump all three packages together.
- **`Line.startIndex` and `Line.endIndex` are offsets into the paragraph's
  source text.** In 0.5 they counted the collapsed text and restarted after
  every `\n`. Code that maps lines back to the source, such as selection or
  caret code, must use the new offsets.

New, optional API: `Line.decorations`, `Line.pIdx` on every line,
`ParagraphStyle.hyphenBreak`, `ListStyle.bulletSize` and `bulletFont`,
`splitParagraphAtHardBreaks()`, and underline and strikeout metrics on
`FontMetrics`.

### Layout output changes

Both modes:

- An indented paragraph or list item that wraps breaks inside its indents, so
  lines that used to run past the box break earlier.
- Nested numbered lists keep counting ("1. a. b. 2.", was "1.").
- Justify stretches every space, single-run paragraphs included.
- `whiteSpace: 'pre'` and `'pre-wrap'` keep their spaces.
- Blank lines are a strut of their run's size.
- Tracked text split at a line end is positioned with its tracking.

`mode: 'office'`:

- The single-spacing baseline moves down 0.27–1.8 pt, more at larger sizes.
- List markers sit where PowerPoint puts them.
- Underline and strikethrough come from the font tables.
- Trailing spaces are not painted.
- Superscript and subscript are 2/3 of the size and rise 30 %.
- `whiteSpace` defaults to `'pre-wrap'`.

## 0.4 → 0.5

0.5.0 was not published to npm: from 0.4.13 the next published version is
0.6.0. Coming from 0.4, read this section and the one above.

### Code changes

- **`@vyaz/core` is a peer dependency** of `@vyaz/renderer` and
  `@vyaz/converters`, and `@vyaz/renderer` of `@vyaz/converters`. Install them
  together at the same version, so an app has one copy of core and one font
  registry.
- **`fontkit` is a regular dependency** of core, no longer optional: all
  measurement goes through it.
- In Node, `registerFont()` from `@vyaz/renderer` now reaches `@vyaz/core`.
  In 0.4 the renderer's Node bundle carried a private copy of core, so a font
  registered through it was missing at layout time (`FontNotFoundError`).

### Security

If you inline SVG built from untrusted input, upgrade: 0.4 wrote SVG attribute
values without escaping, so a colour value could inject an attribute. 0.5
escapes every attribute value and validates colours and font families.

### Layout output changes

`mode: 'browser'` matches Chrome's line box exactly: line heights and vertical
positions move by up to a few pixels. `mode: 'office'` is unchanged.

## 0.3 → 0.4

The HTML converter ships as its own package, `@vyaz/converters`, in the
repository's `packages/converters` folder. The renderer's folder is
`packages/renderers`; its package name is still `@vyaz/renderer`. No API
changed.
