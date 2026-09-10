#!/usr/bin/env python3
"""gen-line-spacing.py — build the line-spacing oracle deck for office-metrics.

Isolates the paragraph line-spacing multiplier (`<a:lnSpc><a:spcPct>`, i.e.
`style.lineHeight` in vyaz) in `mode: 'office'`.

One slide, five **plain TextBoxes** laid left-to-right — no groups, no marker
rects. The row runs past the right slide edge; that is fine, PowerPoint keeps
off-slide shapes and exports them:

    ls-100      one paragraph, line spacing 1.0, wrapped
    ls-150      same text/width, line spacing 1.5
    ls-200      same text/width, line spacing 2.0
    ls-stacked  one box, three paragraphs (1.0 / 1.5 / 2.0), space before/after 0
    ls-mixed    one paragraph, runs 18 / 36 / 18 pt, line spacing 1.5

Each box is fixed-width, word-wrap on, "resize shape to fit text" — PowerPoint
does the wrapping and grows the height. Mirrors the vyaz golden corpus in
`packages/renderers/tests/office-cases/line-spacing-*` (same text, width, font,
line-spacing) so the export and the golden compare directly.

Workflow:
  1. python3 scripts/office-metrics/gen-line-spacing.py
  2. open line-spacing.pptx in PowerPoint, let it re-wrap, save.
  3. per box: select it, File ▸ Export ▸ SVG (selection) → office-cases/<case>/powerpoint.svg
     (box order above; don't swap stacked / mixed).

Needs: python-pptx  (pip install python-pptx). Roboto must be installed so
PowerPoint wraps it the way the goldens expect.
"""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import MSO_AUTO_SIZE, MSO_ANCHOR

FONT = "Roboto"
SIZE_PT = 18
WRAP_TEXT = "Roboto office line spacing sample text that wraps onto several lines here"

# vyaz layout is unit-agnostic; the office-cases goldens use `width` / `fontSize`
# in the *same* unit. Treat 1 vyaz unit = 1 pt (DrawingML's native unit) so the
# deck wraps at the same points as the goldens: box width in pt = golden `width`,
# run size in pt = golden `fontSize`. Using px here (200/96 in) made PowerPoint's
# column ~33% wider in em terms and it wrapped a word earlier than vyaz.

# (name, box_width_pt, [[(text, size_pt), ...] per paragraph], [line_spacing ...])
SAMPLES = [
    ("ls-100",     200, [[(WRAP_TEXT, SIZE_PT)]], [1.0]),
    ("ls-150",     200, [[(WRAP_TEXT, SIZE_PT)]], [1.5]),
    ("ls-200",     200, [[(WRAP_TEXT, SIZE_PT)]], [2.0]),
    ("ls-stacked", 200, [[(WRAP_TEXT, SIZE_PT)],
                         [(WRAP_TEXT, SIZE_PT)],
                         [(WRAP_TEXT, SIZE_PT)]], [1.0, 1.5, 2.0]),
    ("ls-mixed",   260, [[("small before ", 18), ("BIG MIDDLE", 36), (" small after wraps here", 18)]], [1.5]),
]


def add_sample(slide, name, x, box_w_pt, paragraphs, spacings):
    """One fixed-width auto-fit TextBox."""
    tb = slide.shapes.add_textbox(x, Inches(0.4), Pt(box_w_pt), Inches(1))
    tb.name = name
    tf = tb.text_frame
    tf.word_wrap = True
    tf.auto_size = MSO_AUTO_SIZE.SHAPE_TO_FIT_TEXT
    tf.vertical_anchor = MSO_ANCHOR.TOP
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0

    for i, (runs, ls) in enumerate(zip(paragraphs, spacings)):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.line_spacing = ls          # float -> <a:spcPct val="{ls*100000}"/>
        p.space_before = Pt(0)
        p.space_after = Pt(0)
        for text, size in runs:
            r = p.add_run()
            r.text = text
            r.font.name = FONT
            r.font.size = Pt(size)


def main():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    slide = prs.slides.add_slide(prs.slide_layouts[6])  # one blank slide
    x = Inches(0.4)
    gap = Pt(24)
    for name, box_w_pt, paragraphs, spacings in SAMPLES:
        add_sample(slide, name, x, box_w_pt, paragraphs, spacings)
        x += Pt(box_w_pt) + gap  # row runs off the right edge — fine

    out = __file__.rsplit("/", 1)[0] + "/line-spacing.pptx"
    prs.save(out)
    print("wrote", out, f"(1 slide, {len(SAMPLES)} TextBoxes in a row)")


if __name__ == "__main__":
    main()
