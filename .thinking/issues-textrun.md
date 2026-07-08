# Issues: TextRun Tests

All issues go to the `run` branch. Core is already ported — need tests + SVG renderer.

---

## INFRA-1: Setup test environment
Set up vitest, test fonts, and OffscreenCanvas polyfill for running TextRun tests.

**Test fonts strategy:**

We use one primary font + system fonts for different metrics:

| Font | Source | Format | Scripts | Purpose |
|------|--------|--------|---------|---------|
| **Unifont** | `tests/helpers/unifont-17.0.04.otf` | OTF (CFF) | Latin, Cyrillic, CJK, Arabic, Devanagari, Thai, Hebrew | **Primary test font** — loaded via fontkit `registerFont('Unifont', ...)`. Multi-script support in a single binary. |
| **Arial** | System font | TTF | Latin, Cyrillic, Arabic, Hebrew | Different metrics than Unifont — for `fontFamily` comparison tests |
| **Times New Roman** | System font | TTF | Latin, Cyrillic | Different metrics than Arial — for `fontFamily` tests |

**Registration flow in tests:**

```ts
// setup.ts — runs before all tests
import { fontMetricsProvider } from '../src/measure/FontMetricsProvider.js';
import fontkit from 'fontkit';
import { readFileSync } from 'node:fs';

// Register Unifont for deterministic metrics (no system dependency)
const unifontBuffer = readFileSync(require.resolve('./helpers/unifont-17.0.04.otf'));
fontMetricsProvider.registerFont('Unifont', { weight: '400', style: 'normal' }, unifontBuffer);

// Arial and Times New Roman are NOT registered — they use Canvas fallback
// or fontkit's system font loading depending on environment
```

**Why Unifont:**
- Single file covers all scripts we need for testing (Latin, Cyrillic, CJK, Arabic, Devanagari, Thai, Hebrew)
- Deterministic — same file produces same metrics on any OS
- No system font dependency — tests work in CI without Arial/Times installed
- Monospace-like: each glyph has similar advance, making glyphAdvances tests predictable

**Acceptance Criteria:**
- [ ] `vitest` installed and configured
- [ ] `is-svg` package installed
- [ ] `setup.ts` with OffscreenCanvas polyfill (for Node.js)
- [ ] Unifont registered via `fontMetricsProvider.registerFont('Unifont', ...)`
- [ ] `npx vitest run` executes without errors on empty test suite

---

## RENAME-1: Migrate output type names (LineBox → Line, FragmentBox → Span)
Rename `LineBox` → `Line` and `FragmentBox` → `Span` across the entire codebase.

Short output names make the API cleaner and easier to read:
- `Line` (4 chars) instead of `LineBox` (7)
- `Span` (4 chars) instead of `FragmentBox` (11)

`Span` maps directly to HTML `<tspan>` — the SVG output element for each text piece.

**Old → New:**
| Old | New | Location |
|-----|-----|----------|
| `LineBox` | `Line` | `types/LayoutTypes.ts`, all references |
| `FragmentBox` | `Span` | `types/LayoutTypes.ts`, all references |

**Files to update:**
- `types/LayoutTypes.ts` — rename interfaces, keep backward compat aliases if needed
- `layout/PositioningEngine.ts` — type references
- `layout/LineBoxValidator.ts` — type references
- `render/SVGRenderer.ts` — type references
- `render/CanvasRenderer.ts` — type references
- `compile/DocumentCompiler.ts` — comments only (no direct ref)
- `index.ts` — export the new names
- `tests/*.ts` — all test files referencing `LineBox` / `FragmentBox`
- `docs/core-api/` — generated docs (regenerate after rename)

**Acceptance Criteria:**
- [ ] `LineBox` renamed to `Line` in all source and test files
- [ ] `FragmentBox` renamed to `Span` in all source and test files
- [ ] `index.ts` exports `Line` and `Span` instead of `LineBox` and `FragmentBox`
- [ ] Old names kept as `type LineBox = Line` / `type FragmentBox = Span` for backward compat (deprecated)
- [ ] All tests pass after rename
- [ ] Generated docs regenerated

---

## RUN-CORE: TextRun layout tests (all properties)
One issue covering all TextRun properties, `Span` (ex-FragmentBox) output, multi-run, trailing whitespace, break types, glyph advances, contentWidth, and invariants.

**Font usage in tests:**

All tests default to Unifont (registered in INFRA-1). `fontFamily` tests use system fonts (Arial, Times New Roman) via Canvas fallback — these tests are skipped if Canvas is unavailable.

```ts
// Default test helper (background-color)
makeParagraph('Hello'); // → fontFamily: 'Unifont', fontSize: 16

// Style override (system font for comparison)
makeStyledParagraph('Hello', { fontFamily: 'Arial' });

// Multi-run with different fonts
makeMultiRunParagraph([
  { text: 'Unifont ' },
  { text: 'Arial', style: { fontFamily: 'Arial' } },
]);
```

### 1. TextRun.type: 'text'
- [ ] `type: 'text'` → Span has `type: 'text'`
- [ ] text content correctly maps to `Span.text`
- [ ] non-breaking space (U+00A0) does NOT create a separate space span
- [ ] leading spaces are trimmed (in `whiteSpace: 'normal'` mode)
- [ ] trailing spaces are trimmed, marked `trailing: true`
- [ ] multiple spaces inside a run stay in one text span
- [ ] multi-script: Latin, Cyrillic, CJK, Arabic, Devanagari — all in one text span

### 2. TextRun.type: 'inline-box'
- [ ] `type: 'inline-box'` → Span contains `inlineWidget`
- [ ] `inlineWidget.width` equals span width
- [ ] `inlineWidget.height` does not affect width (only line height)
- [ ] `inlineWidget.baselineOffset` shifts widget position
- [ ] Span has `type: 'text'` (inline-box is not a space)
- [ ] text inside inline-box is `'\uFFFC'`

### 3. TextRun.fontFamily
- [ ] `fontFamily: 'Unifont'` → Span.style.fontFamily === 'Unifont'
- [ ] `fontFamily: 'Arial'` → different ascent/descent metrics than Unifont
- [ ] default font from `DEFAULT_TEXT_STYLE.fontFamily`

### 4. TextRun.fontSize
- [ ] `fontSize: 16` → Span.fontMetrics.fontSize === 16
- [ ] `fontSize: 32` → width is ~2× width of `fontSize: 16` (with tolerance)
- [ ] larger fontSize → larger line height
- [ ] default fontSize — 12px from `DEFAULT_TEXT_STYLE`

### 5. TextRun.fontWeight
- [ ] `fontWeight: 'normal'` → Span.style.fontWeight === 400
- [ ] `fontWeight: 'bold'` → Span.style.fontWeight === 700
- [ ] `fontWeight: 300` → Span.style.fontWeight === 300
- [ ] `fontWeight: 900` → Span.style.fontWeight === 900
- [ ] default — 400

### 6. TextRun.fontStyle
- [ ] `fontStyle: 'normal'` → Span.style.fontStyle === 'normal'
- [ ] `fontStyle: 'italic'` → Span.style.fontStyle === 'italic'
- [ ] default — 'normal'

### 7. TextRun.color
- [ ] `color: '#FF0000'` → Span.style.color === '#FF0000'
- [ ] `color: '#0000FF'` → Span.style.color === '#0000FF'
- [ ] `color: '#000'` (3-hex) → correctly preserved
- [ ] default — '#000000'

### 8. TextRun.backgroundColor
- [ ] `backgroundColor: '#FFFF00'` → Span.style.backgroundColor === '#FFFF00'
- [ ] no backgroundColor → `undefined`

### 9. TextRun.letterSpacing
- [ ] `letterSpacing: 2` → text wider than without letterSpacing
- [ ] `letterSpacing: 0` → same width as without letterSpacing
- [ ] negative `letterSpacing` reduces width

### 10. TextRun.script: 'super' / 'sub'
- [ ] `script: 'super'` → effectiveFontSize = fontSize * 0.65
- [ ] `script: 'super'` → baselineOffset = fontSize * -0.4 (raised)
- [ ] `script: 'sub'` → effectiveFontSize = fontSize * 0.65
- [ ] `script: 'sub'` → baselineOffset = fontSize * 0.15 (lowered)
- [ ] `script: 'normal'` → no scaling, no offset
- [ ] Span.fontMetrics.fontSize uses effective (scaled) size
- [ ] normal + superscript mixed in one line — baseline is consistent

### 11. TextRun.underline
- [ ] `underline: true` → Span.style.underline === true
- [ ] `underline: false` → Span.style.underline === false
- [ ] underline does not affect width or height (render-only)

### 12. TextRun.strikethrough
- [ ] `strikethrough: true` → Span.style.strikethrough === true
- [ ] `strikethrough: false` → Span.style.strikethrough === false
- [ ] strikethrough does not affect width or height (render-only)

### 13. TextRun.overline (todo)
- [ ] `overline: true` → Span.style.overline === true
- [ ] overline does not affect width or height

### 14. Multi-run styling
- [ ] each TextRun → separate Span with correct itemIndex
- [ ] adjacent runs with different styles → different Span
- [ ] adjacent runs with identical styles → different Span (no merge)
- [ ] space across runs: `"Hello" + " World"` → ['text:Hello', 'space: ', 'text:World']
- [ ] space inside run: `"Hello " + "World"` → ['text:Hello', 'space: ', 'text:World']
- [ ] standalone space run: `"Hello" + " " + "World"` → ['text:Hello', 'space: ', 'text:World']

### 15. Span.trailing (trailing whitespace)
- [ ] last space in a line → `trailing: true`
- [ ] multiple trailing spaces → all marked trailing: true
- [ ] trailing space does NOT participate in line advance (width fit)
- [ ] trailing space does NOT get extra width during justify
- [ ] space in the middle of a line → trailing: false

### 16. Span.breakType
- [ ] last span of the last line → breakType: undefined (no break)
- [ ] line soft-wrapped → last span has breakType: 'soft'
- [ ] line ending in `\n` → last span has breakType: 'hard'
- [ ] single-line paragraph → breakType: undefined

### 17. Span.glyphAdvances
- [ ] `Span.glyphAdvances` is an array of length = text.length
- [ ] each advance > 0
- [ ] `sum(glyphAdvances)` ≈ `span.width`
- [ ] inline-box: glyphAdvances is undefined

### 18. ParagraphLayoutResult
- [ ] single run single line: contentWidth === line.width
- [ ] multi-run single line: contentWidth === line.width
- [ ] multi-line (wrapping): contentWidth >= max(line.width)

### 19. Invariants (assertLineInvariants)
- [ ] Index Consistency: sum of line lengths === total text length
- [ ] No Overlap: lines do not intersect (line[i+1].y >= line[i].y + line[i].height)
- [ ] Width Fit: line width ≤ maxWidth
- [ ] Zero-width: width=0 does not crash
- [ ] Infinite-width: all text in one line
- [ ] Baseline Consistency: all spans in a line share the same baseline

---

## RUN-RENDER: SVG + Debug renderer for TextRun
One issue covering SVG output for all TextRun style properties, presets, correctness, and debug overlays.

**Acceptance Criteria:**

### Basic SVG output
- [ ] plain text renders valid SVG (`is-svg` passes)
- [ ] `<text x="..." y="...">` has correct baseline coordinates: `y = line.y + line.baseline`

### Style properties in SVG (preset='preserve')
- [ ] `fontWeight: 'bold'` → `<tspan font-weight="700">`
- [ ] `fontWeight: 'normal'` → `<tspan font-weight="400">`
- [ ] `fontStyle: 'italic'` → `<tspan font-style="italic">`
- [ ] `fontFamily: 'Arial'` → `<tspan font-family="Arial">`
- [ ] `fontSize: 24` → `<tspan font-size="24">`
- [ ] `color: '#FF0000'` → `<tspan fill="rgb(255, 0, 0)">`
- [ ] `underline: true` → `<tspan text-decoration="underline">`
- [ ] `strikethrough: true` → `<tspan text-decoration="line-through">`

### Multi-run SVG
- [ ] multiple runs → multiple `<tspan>` elements inside one `<text>`
- [ ] each `<tspan>` has correct `x` position
- [ ] space spans render as `<tspan> </tspan>` (with xml:space="preserve")

### Preset: 'flat'
- [ ] `preset='flat'` renders all text as a single string inside `<text>`
- [ ] no `<tspan>` elements
- [ ] supports `text-anchor` for alignment

### Preset: 'browser'
- [ ] `preset='browser'` — expanded `<tspan>` per run
- [ ] NO `xml:space="preserve"` attribute
- [ ] space spans are skipped (not rendered)

### Preset: 'glyph'
- [ ] `preset='glyph'` — each glyph has its own `x` position
- [ ] `<tspan x="x0 x1 x2 ...">` with per-character positions
- [ ] correct x positions for left, center, right alignment

### Debug overlays (DebugFlags)
- [ ] `debug.box` → red `<rect>` per line matching `Line` x, y, width, height
- [ ] `debug.baseline` → blue `<line>` at `y = line.y + line.baseline`
- [ ] `debug.ascentDescent` → green dashed `<line>` at ascent/descent edges
- [ ] `debug.frame` → yellow dashed `<rect>` around full content block
- [ ] `debug.labels` → text label per line: `y=12.3 x=0.0 w=285.0 h=22.4`
- [ ] `debug.runs` → purple `<rect>` per span at `x = line.x + span.x`, `y = baseline - ascent`
- [ ] `debug.lineGap` → light blue fill rect per line
- [ ] all 7 flags combined → valid SVG, no missing elements, no visual conflict
- [ ] Canvas: `renderToCanvas` accepts `debug` option, all flags render correctly
- [ ] Canvas PNG snapshot with debug flags matches SVG debug output visually