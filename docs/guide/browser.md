# Using Vyaz in the browser

Vyaz runs unchanged in the browser: `@vyaz/core` lays text out and `@vyaz/renderer`
turns the result into an `<svg>` string you drop into the DOM. There is exactly
one thing you have to get right.

## The one rule: register every font twice

Two independent things measure your text:

| who | uses | for |
|---|---|---|
| **the layout engine** | `fontMetricsProvider` (fontkit over the raw font bytes) | line breaking, x/y of every run, per-glyph advances |
| **the browser** | its own font stack | painting the `<text>` / `<tspan>` you emit |

If those two see **different fonts**, the layout is computed against font A and
painted with font B. Symptoms:

- **`glyph` preset:** characters overlap or spread — the `<tspan x="…">` values are
  font A's advances, the glyphs drawn are font B's.
- **`flat` / `browser` preset:** the debug `contentBox` / `frameBox` is narrower (or
  wider) than the text the browser actually paints; text overflows its box.
- Non-Latin text (Cyrillic, Greek, …) is the worst hit, because the browser's
  fallback font is metrically nothing like the one you measured with.

So: for **each** family / weight / style you use, do **both**

1. `fontMetricsProvider.registerFont(...)` — so the engine measures it
2. `document.fonts.add(new FontFace(...))` — so the browser paints it

from the **same bytes**.

## Vanilla JS

```ts
import { layoutTextFrame, fontMetricsProvider } from '@vyaz/core';
import { renderToSVG } from '@vyaz/renderer';
import type { TextFrame } from '@vyaz/core';

/** Load one font file and make it available to BOTH the engine and the browser. */
async function loadFont(
  family: string,
  url: string,
  opts: { weight?: string; style?: string; variable?: boolean } = {},
) {
  const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
  const weight = opts.weight ?? '400';
  const style = opts.style ?? 'normal';

  // 1 — layout metrics
  await fontMetricsProvider.registerFont(family, { weight, style }, bytes);

  // 2 — browser paint (same bytes). One FontFace over the whole axis range
  //     for a variable font; a plain weight for a static file.
  const face = new FontFace(family, bytes, {
    weight: opts.variable ? '1 1000' : weight,
    style,
    display: 'swap',
  });
  await face.load();
  document.fonts.add(face);
}

await loadFont('Inter', '/fonts/Inter-Variable.ttf', { variable: true });
await loadFont('Inter', '/fonts/Inter-Variable.ttf', { variable: true, weight: '700' });
await document.fonts.ready; // let the browser finish before you measure

const frame: TextFrame = {
  width: 480,
  wrap: true,
  paragraphs: [
    {
      style: { alignment: 'left', lineHeight: 1.4, spaceBefore: 0, spaceAfter: 0 },
      children: [
        { text: 'Typography ', fontFamily: 'Inter', fontSize: 20, fontWeight: 'bold' },
        { text: 'привет — Ελλάδα', fontFamily: 'Inter', fontSize: 20 },
      ],
    },
  ],
};

const result = layoutTextFrame(frame);
document.querySelector('#out')!.innerHTML = renderToSVG(result.lines, {
  preset: 'browser',
  sizing: 'content',
});
```

`renderToSVG` returns a string — assign it to `innerHTML`, or parse it with
`DOMParser` if you need the nodes.

## Vue

A small composable that owns font loading and re-lays out when the frame changes:

```ts
// useVyaz.ts
import { ref, shallowRef, watchEffect, type Ref } from 'vue';
import { layoutTextFrame, fontMetricsProvider } from '@vyaz/core';
import { renderToSVG, type SvgPreset } from '@vyaz/renderer';
import type { TextFrame } from '@vyaz/core';

const FONTS = [
  { family: 'Roboto', url: '/fonts/Roboto-VariableFont_wdth,wght.ttf', variable: true },
  { family: 'Inter',  url: '/fonts/Inter-Variable.ttf',                variable: true },
];

let fontsPromise: Promise<void> | null = null;
function ensureFonts() {
  return (fontsPromise ??= (async () => {
    for (const f of FONTS) {
      const bytes = new Uint8Array(await (await fetch(f.url)).arrayBuffer());
      for (const weight of ['400', '700'] as const) {
        await fontMetricsProvider.registerFont(
          f.family,
          { weight, ...(f.variable && weight === '700' ? { variation: { wght: 700 } } : {}) },
          bytes,
        );
      }
      const face = new FontFace(f.family, bytes, {
        weight: f.variable ? '1 1000' : '400',
        display: 'swap',
      });
      await face.load();
      document.fonts.add(face);
    }
    await document.fonts.ready;
  })());
}

export function useVyaz(frame: Ref<TextFrame>, preset: Ref<SvgPreset> = ref('browser')) {
  const svg = shallowRef('');
  const ready = ref(false);

  ensureFonts().then(() => (ready.value = true));

  watchEffect(() => {
    if (!ready.value) return;
    const result = layoutTextFrame(frame.value);
    svg.value = renderToSVG(result.lines, { preset: preset.value, sizing: 'content' });
  });

  return { svg, ready };
}
```

```vue
<!-- Preview.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import type { TextFrame } from '@vyaz/core';
import { useVyaz } from './useVyaz';

const frame = ref<TextFrame>({
  width: 480, wrap: true,
  paragraphs: [{
    style: { alignment: 'left', lineHeight: 1.4, spaceBefore: 0, spaceAfter: 0 },
    children: [{ text: 'Vyaz Playground привет', fontFamily: 'Roboto', fontSize: 24 }],
  }],
});
const { svg, ready } = useVyaz(frame);
</script>

<template>
  <div v-if="ready" v-html="svg" />
  <div v-else>loading fonts…</div>
</template>
```

## Notes

### Variable fonts

Register one `FontFace` with `weight: '1 1000'` — the browser instances it per
`font-weight`. On the metrics side, pass `variation` to pin a concrete instance:

```ts
await fontMetricsProvider.registerFont('Roboto', { weight: '700', variation: { wght: 700 } }, bytes);
// optical sizing: match font-optical-sizing: auto by pinning opsz to the size
await fontMetricsProvider.registerFont('Inter', { weight: '400', variation: { opsz: 24 } }, bytes);
```

Without `variation`, the engine measures the font's default master (usually
`wght 400`), so a `bold` run would come out regular-width.

### Matching the browser more closely — `shaping`

By default the engine sums per-code-point advance widths — no kerning, no
ligatures. For the `browser` preset, where on-screen width must line up with the
layout, opt into fontkit's shaper:

```ts
const result = layoutTextFrame(frame, { shaping: true });
```

This applies GPOS kerning and GSUB (`liga`, `clig`, `calt`) — what a browser does
by default — and lands within a fraction of a pixel of Chrome for Latin /
Cyrillic / Greek. Leave it off for the `glyph` preset (its per-character `x` is
not shaping-aware yet).

### Legacy family names

If your content carries CSS names you don't ship (`Arial`, `Helvetica`,
`monospace`, …), map them to a real face — again on **both** sides — so neither
the engine nor the browser falls back:

```ts
for (const alias of ['Arial', 'Helvetica', 'monospace']) {
  await fontMetricsProvider.registerFont(alias, { weight: '400' }, robotoBytes);
  document.fonts.add(await new FontFace(alias, robotoBytes, { weight: '1 1000' }).load());
}
```

Or set `layoutTextFrame(frame, { onMissingFont: 'substitute' })` to fall back to
any registered family (with a `result.warnings` entry) instead of throwing
`FontNotFoundError`.

### Timing

`registerFont` is async; so is `FontFace.load()`. Await every registration and
`document.fonts.ready` **before** the first `layoutTextFrame` / `renderToSVG`, or
the first render measures against a fallback and looks wrong until it re-runs.

### Bundlers

`@vyaz/core` pulls in `fontkit`; Node-only helpers (`get-system-fonts`,
`@napi-rs/canvas`) are behind dynamic imports and tree-shake out of a browser
build. With Vite, nothing special is needed. `renderToSVG` has no Node
dependencies.
