---
title: HTML → SVG
aside: false
outline: false
---

# HTML → SVG

Paste a formatted-HTML fragment on top; [`@vyaz/converters`](https://github.com/sedrew/vyaz/tree/main/packages/converters)
converts it to a `TextFrame`, the engine lays it out, and the renderer produces
the SVG below. Switch the **Code / Preview** tabs to compare your source with how
a browser renders it. Debug overlays are off — the <kbd>debug</kbd> menu turns
them on. **Download SVG** saves a self-contained file with fonts inlined.

<ClientOnly>
  <Converter />
</ClientOnly>

<details>
<summary><strong>Limitations</strong> — this is a formatted-text tool, not a web-page renderer</summary>

About **85%** of the tags in the [html5-test-page](https://gist.github.com/caseyamcl/9260337)
convert.

- **Works:** headings, paragraphs, `strong` / `em` / `u` / `s` / `sup` / `sub` /
  `small` / `mark` / `code`, links (as style — the `href` is not kept), ordered
  and unordered lists (including nesting), `blockquote`, `pre`, `dl`, `table`
  (`colspan`/`rowspan`, `<caption>`, header shading), inline `style=""`.
- **Drawn into an SVG box** *(coming next)*: `img` (as base64), inline `svg`,
  `progress`, `meter`, `hr`.
- **Dropped** (listed under the result): `video` / `audio` / `iframe` /
  `canvas`, form controls, `<style>` and class-based CSS, `position` / `flex` /
  `grid` / `float`.

Everything simplified or removed is reported in the panel beneath the SVG.

</details>
