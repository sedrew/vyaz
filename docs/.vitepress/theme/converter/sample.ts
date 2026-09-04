/**
 * sample.ts — default input for the Converter page.
 *
 * A trimmed slice of the html5-test-page (caseyamcl/9260337) — enough tags to
 * show clean conversion, a few `warnings`, and the `dropped` list (table).
 */
export const SAMPLE_HTML = `<h1>Typography &amp; HTML → SVG</h1>

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

<h3>Dropped on purpose</h3>
<table>
  <thead><tr><th>Feature</th><th>State</th></tr></thead>
  <tbody><tr><td>tables</td><td>need a grid layout</td></tr></tbody>
</table>
<address>221B Baker Street, London</address>
`;
