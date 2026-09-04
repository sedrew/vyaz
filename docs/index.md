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
  - title: Rich Runs
    details: Bold, italic, size, colour, background, letter-spacing, sub/superscript, decorations
  - title: Lists & Columns
    details: Nested bullet/numbered lists, custom markers, multi-column with balanced fill
  - title: Auto-Fit
    details: Scale text proportionally to fit the container
  - title: Office Compatible
    details: "mode: 'office' for PowerPoint / DrawingML line boxes"
  - title: SVG Output
    details: Four presets (flat / browser / preserve / glyph), opt-in shaping, debug overlays
---