/**
 * sample.ts — default input for the Converter page.
 *
 * A trimmed slice of the html5-test-page (caseyamcl/9260337) — enough tags to
 * show clean conversion, a few `warnings`, a converted `<table>`, an inline
 * `<img>` (the Vyaz mark, as a self-contained `data:` URI), and the `dropped`
 * list (`<video>`, a form control).
 */
import { LOGO_DATA_URI } from './sample-logo';

export const SAMPLE_HTML = `<h1>Typography &amp; HTML to SVG</h1>

<p>A paragraph with <strong>strong</strong>, <em>emphasis</em>, a
<a href="https://example.com">hyperlink</a>, some <code>inline_code()</code>,
<mark>a highlight</mark>, <small>fine print</small>, and
H<sub>2</sub>O with E = mc<sup>2</sup>.</p>

<p>Text can be <ins>inserted</ins> or <del>deleted</del>, and an
<abbr title="Abbreviation">abbr.</abbr> keeps only its text.</p>

<h2>Lists</h2>
<ul>
  <li>Unordered item one</li>
  <li>Item two, with a nested list:
    <ol>
      <li>nested first</li>
      <li>nested second</li>
    </ol>
  </li>
  <li>Item three</li>
</ul>

<h3>Blockquote &amp; preformatted</h3>
<blockquote><p>"The details are not the details. They make the design."</p></blockquote>

<pre>function greet(name) {
  return "Hello, " + name;
}</pre>

<h3>Definition list</h3>
<dl>
  <dt>TextFrame</dt>
  <dd>The root container — geometry plus a paragraph array.</dd>
  <dt>TextRun</dt>
  <dd>A styled inline fragment.</dd>
</dl>

<h3>Images</h3>
<p>The <img src="${LOGO_DATA_URI}" width="20" height="20" alt="Vyaz logo"> mark
sits inline — a <code>data:</code> source is spliced straight into the SVG. A
lone image takes a line to itself:</p>
<img src="${LOGO_DATA_URI}" width="44" height="44" alt="Vyaz logo">

<h3>Table</h3>
<table>
  <caption>Converter coverage</caption>
  <thead><tr><th>Feature</th><th>Status</th></tr></thead>
  <tbody>
    <tr><td>Grid sizing, colspan/rowspan</td><td>done</td></tr>
    <tr><td>Borders &amp; header shading</td><td>done</td></tr>
  </tbody>
</table>

<h3>Dropped on purpose</h3>
<p>A video needs playback, a text field needs input — neither survives:</p>
<video src="clip.mp4" controls></video>
<input type="text" placeholder="name">
<address>221B Baker Street, London</address>
`;

/**
 * A CommonMark + GFM slice covering the same breadth as SAMPLE_HTML, plus
 * one thing HTML input can't demonstrate: raw HTML embedded in the
 * Markdown source (the `<mark>` below) converts too, with no special
 * handling — see markdownToTextFrame()'s module doc.
 */
export const SAMPLE_MARKDOWN = `# Typography & Markdown to SVG

A paragraph with **strong**, _emphasis_, a [hyperlink](https://example.com),
and some \`inline_code()\`.

Text can be ~~struck through~~, and raw HTML converts too —
<mark>a highlight</mark> — right in the Markdown source.

An inline logo ![Vyaz logo][logo] embeds straight into the SVG — a Markdown
image runs through the same \`<img>\` path under the hood.

## Lists

- Unordered item one
- Item two, with a nested list:
  1. nested first
  2. nested second
- Item three

### Blockquote & preformatted

> "The details are not the details. They make the design."

\`\`\`
function greet(name) {
  return "Hello, " + name;
}
\`\`\`

### GFM table

| Feature | Status |
|---|---|
| Grid sizing, colspan/rowspan | done |
| Borders & header shading | done |
| Raw HTML passthrough | done |

### Dropped on purpose

A video needs playback, a text field needs input — neither survives, even
embedded as raw HTML in Markdown:

<video src="clip.mp4" controls></video>
<input type="text" placeholder="name">

[logo]: ${LOGO_DATA_URI}
`;
