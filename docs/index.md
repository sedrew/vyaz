---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "Vyaz"
  text: "Rich text layout engine"
  tagline: TypeScript, isomorphic (browser + Bun/Node.js), pixel-perfect typography
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: API Reference
      link: /api/core

features:
  - title: Text Frame Layout
    details: Multi-paragraph frames with padding, wrapping, and vertical alignment
  - title: Multi-Font Styling
    details: Bold, italic, size, color, subscript/superscript, letter-spacing
  - title: Writing Modes
    details: horizontal-tb, vertical-rl, vertical-lr with text orientation
  - title: Auto-Fit
    details: Scale text proportionally to fit the container
  - title: Office Compatible
    details: "mode: 'office' for PowerPoint/DrawingML rendering"
  - title: SVG & Canvas Output
    details: Four SVG presets and Canvas renderer with debug overlays
---