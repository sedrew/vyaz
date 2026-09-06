#!/usr/bin/env python3
"""
overlay-slides.py — build _overlay.pptx from overlay/_plan.json.

    bun scripts/office-visual-diff/overlay-slides.ts   # renders overlay/<slug>.png (red) + _plan.json
    python3 scripts/office-visual-diff/overlay-slides.py

Per slide:
  1. the native PowerPoint text box for the case, sized to VYAZ's
     content.width x content.height, word-wrap on, zero insets — black text.
  2. the vyaz glyph render (red, transparent PNG) as a picture at the SAME
     left/top and the SAME width/height.

Same rectangle, two engines. Where they agree the red covers the black; where
vyaz drifts you see red or black poking out. A colour check, no measurement.
"""
import json
import os
import re

from pptx import Presentation
from pptx.util import Pt, Emu
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor

HERE = os.path.dirname(os.path.abspath(__file__))
CORPUS = os.path.normpath(os.path.join(HERE, "../../packages/renderers/tests/cases"))
OVERLAY = os.path.join(HERE, "overlay")

SLIDE_W_PT, SLIDE_H_PT, MARGIN_PT = 960.0, 540.0, 24.0
ALIGN = {"left": PP_ALIGN.LEFT, "right": PP_ALIGN.RIGHT,
         "center": PP_ALIGN.CENTER, "justify": PP_ALIGN.JUSTIFY}
DEFAULT_TEXT = {"fontFamily": "Arial", "fontSize": 12, "fontWeight": "normal",
                "fontStyle": "normal", "color": "#000000"}


def hex_rgb(c):
    try:
        c = (c or "000000").lstrip("#")
        if len(c) == 3:
            c = "".join(ch * 2 for ch in c)
        return RGBColor(int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16))
    except Exception:
        return RGBColor(0, 0, 0)


def fam(f):
    return str(f[0]) if isinstance(f, list) and f else str(f or "Arial")


def xf(text, kind):
    if kind == "uppercase":
        return text.upper()
    if kind == "lowercase":
        return text.lower()
    if kind == "capitalize":
        return re.sub(r"(?<![^\W_])\w", lambda m: m.group().upper(), text)
    return text


def add_textbox(slide, frame, left, top, w_pt, h_pt):
    d = {**DEFAULT_TEXT, **(frame.get("defaultStyle") or {})}
    box = slide.shapes.add_textbox(left, top, Pt(w_pt), Pt(h_pt))
    tf = box.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    paras = [p for p in frame["paragraphs"]
             if any(r.get("type") != "inline-box" and isinstance(r.get("text"), str) and r["text"]
                    for r in p.get("children", []))]
    for pi, p in enumerate(paras):
        ps = p.get("style") or {}
        para = tf.paragraphs[0] if pi == 0 else tf.add_paragraph()
        para.alignment = ALIGN.get(ps.get("alignment", "left"), PP_ALIGN.LEFT)
        if ps.get("spaceBefore"):
            para.space_before = Pt(float(ps["spaceBefore"]))
        if ps.get("spaceAfter"):
            para.space_after = Pt(float(ps["spaceAfter"]))
        # only when the case explicitly set lineHeight, and as a MULTIPLE of
        # PowerPoint's per-font "Single"; otherwise leave it native.
        lh = ps.get("lineHeight")
        if lh is not None and abs(float(lh) - 1.15) > 1e-6:  # 1.15 = vyaz default
            para.line_spacing = float(lh)
        for r in p.get("children", []):
            if r.get("type") == "inline-box" or not isinstance(r.get("text"), str):
                continue
            s = {**d, **r}
            run = para.add_run()
            run.text = xf(r["text"], s.get("textTransform"))
            f = run.font
            f.name = fam(s.get("fontFamily"))
            f.size = Pt(float(s.get("fontSize", 12)))
            fw = s.get("fontWeight")
            f.bold = fw == "bold" or (isinstance(fw, (int, float)) and fw >= 600)
            f.italic = s.get("fontStyle") == "italic"
            f.underline = bool(s.get("underline"))
            f.color.rgb = hex_rgb(s.get("color"))
            rPr = run._r.get_or_add_rPr()
            if s.get("strikethrough"):
                rPr.set("strike", "sngStrike")
            if s.get("letterSpacing"):
                rPr.set("spc", str(int(round(float(s["letterSpacing"]) * 100))))
            if s.get("script") == "super":
                rPr.set("baseline", "30000")
            elif s.get("script") == "sub":
                rPr.set("baseline", "-25000")
    return box


def main():
    plan = json.load(open(os.path.join(OVERLAY, "_plan.json")))["plan"]
    prs = Presentation()
    prs.slide_width = Emu(int(SLIDE_W_PT * 12700))
    prs.slide_height = Emu(int(SLIDE_H_PT * 12700))
    blank = prs.slide_layouts[6]

    for c in plan:
        frame = json.load(open(os.path.join(CORPUS, c["name"], "input.json")))["frame"]
        w_pt, h_pt = c["contentWpt"], c["contentHpt"]
        left, top = Pt(MARGIN_PT), Pt(MARGIN_PT)

        slide = prs.slides.add_slide(blank)
        # 1 — native text box, sized to vyaz content box
        add_textbox(slide, frame, left, top, w_pt, h_pt)
        # 2 — vyaz render (red, transparent) same rect, nudged down by the
        #     first-line leading so the two first baselines coincide
        png = os.path.join(OVERLAY, f"{c['slug']}.png")
        slide.shapes.add_picture(
            png, left, top + Pt(c.get("firstLeadingPt", 0)), Pt(w_pt), Pt(h_pt)
        )

        # label
        cap = slide.shapes.add_textbox(left, Pt(MARGIN_PT + h_pt + 12), Pt(600), Pt(20))
        cap.text_frame.text = f"{c['name']}   vyaz box {w_pt:.1f}x{h_pt:.1f}pt   (black = PowerPoint, red = vyaz)"
        cap.text_frame.paragraphs[0].runs[0].font.size = Pt(9)
        cap.text_frame.paragraphs[0].runs[0].font.color.rgb = RGBColor(0x88, 0x88, 0x88)

    out = os.path.join(HERE, "_overlay.pptx")
    prs.save(out)
    print(f"wrote {out} ({len(plan)} slides) — open in PowerPoint; red should sit on black")


if __name__ == "__main__":
    main()
