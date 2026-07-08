# Issues: Renderer Debug Mode

All issues go to the `run` branch. Covers `DebugFlags` visual overlays for SVG and Canvas renderers: line boxes, baselines, ascent/descent, frame, fragment boxes, and line gap fills.

`DebugFlags` interface:

```ts
interface DebugFlags {
  box?: boolean;          // line box outlines (red)
  baseline?: boolean;     // baseline lines (blue)
  ascentDescent?: boolean; // ascent/descent lines (green dashed)
  frame?: boolean;        // frame rectangle (yellow dashed)
  labels?: boolean;       // coordinate labels (y, x, w, h)
  runs?: boolean;         // per-fragment boxes (purple)
  lineGap?: boolean;      // line height background fill (light blue)
}
```

---

## DEBUG-1: DebugFlags.box — line box outlines
Red rectangle for each line's bounding box.

**Acceptance Criteria:**
- [ ] single run one line → one red rect matching `Line` x, y, width, height
- [ ] single run narrow container (multi-line) → one red rect per line
- [ ] multi-run line → red rect around the entire line, not individual spans
- [ ] SVG: `<rect>` with `stroke="rgba(255,100,100,0.5)" stroke-width="1"`
- [ ] box rect does NOT clip text (renders behind or on top)

---

## DEBUG-2: DebugFlags.baseline — baseline lines
Blue horizontal line at the baseline position.

**Acceptance Criteria:**
- [ ] single line → one blue line at `y = line.y + line.baseline`
- [ ] multi-line → one blue line per line, stepping down
- [ ] multi-run different fonts → single shared baseline across all spans
- [ ] SVG: `<line>` with `stroke="rgba(100,100,255,0.5)" stroke-width="1"` from `x=line.x` to `x=line.x+line.width`

---

## DEBUG-3: DebugFlags.ascentDescent — ascent / descent lines
Green dashed lines at the ascent and descent edges.

**Acceptance Criteria:**
- [ ] single line → green line at `y + baseline - ascent` and `y + baseline + descent`
- [ ] multi-run mixed font sizes → ascent = max across all spans, descent = max across all spans
- [ ] superscript run → ascent line accounts for baselineOffset shift
- [ ] SVG: `<line>` with `stroke="rgba(100,255,100,0.4)" stroke-width="0.5" stroke-dasharray="3,2"`

---

## DEBUG-4: DebugFlags.frame — frame rectangle
Yellow dashed rectangle around the entire content block.

**Acceptance Criteria:**
- [ ] single line → yellow rect around the full content area
- [ ] multi-line → yellow rect spanning from first line top to last line bottom
- [ ] frame rect width = max line width across all lines
- [ ] SVG: `<rect>` with `fill="none" stroke="rgba(255,200,0,0.6)" stroke-width="1" stroke-dasharray="6,2"`

---

## DEBUG-5: DebugFlags.labels — coordinate labels
Text labels showing y, x, width, height for each line.

**Acceptance Criteria:**
- [ ] each line → label text: `y=12.3 x=0.0 w=285.0 h=22.4`
- [ ] label positioned above the line (`y = line.y - 2`)
- [ ] label uses `font-size="9"`, `font-family="monospace"`, `fill="rgba(0,0,0,0.55)"`
- [ ] multi-line → correct labels for each line

---

## DEBUG-6: DebugFlags.runs — per-fragment boxes
Purple rectangles for each text fragment's bounding box.

**Acceptance Criteria:**
- [ ] single run → one purple rect at `x = line.x + span.x`, `y = baseline - ascent`
- [ ] multi-run → multiple purple rects, one per span
- [ ] space spans → purple rect for the space (zero or positive width)
- [ ] inline-box → purple rect at widget position
- [ ] SVG: `<rect>` with `fill="none" stroke="rgba(200,100,255,0.4)" stroke-width="0.5"`
- [ ] rects do NOT overlap (adjacent spans touch without gap)

---

## DEBUG-7: DebugFlags.lineGap — line height background fill
Light blue filled rectangle behind each line.

**Acceptance Criteria:**
- [ ] each line → light blue fill at `x, y` with `width, height`
- [ ] semi-transparent: `fill="rgba(0,150,255,0.10)" stroke="none"`
- [ ] multi-line → fills stack correctly without overlap
- [ ] combined with `box` and `labels`: fill, rect outline, text label all visible

---

## DEBUG-8: All flags combined — full debug overlay
All debug flags rendered simultaneously.

**Acceptance Criteria:**
- [ ] all 7 flags active at once → no visual conflict (no missing elements)
- [ ] valid SVG output (`is-svg` passes)
- [ ] Canvas: same flags produce comparable visual
- [ ] performance: single layout, multiple debug renders re-use the same layout result

---

## DEBUG-9: Canvas debug renderer
Verify `renderToCanvas` with debug flags produces correct Canvas output.

**Acceptance Criteria:**
- [ ] `renderToCanvas` accepts `debug` in options
- [ ] `debug.box` → red rects on canvas
- [ ] `debug.baseline` → blue lines on canvas
- [ ] `debug.labels` → text labels on canvas
- [ ] `debug.ascentDescent` → green dashed lines
- [ ] `debug.runs` → purple rects
- [ ] `debug.frame` → yellow frame
- [ ] `debug.lineGap` → light blue background fills
- [ ] all flags combined → all overlays visible, no interference with text
- [ ] Canvas PNG snapshot matches SVG debug output (visual comparison)
