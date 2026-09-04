<template>
  <div class="cv">
    <section class="cv__pane">
      <header class="cv__hd">HTML</header>
      <HtmlInput v-model="html" />
    </section>

    <section class="cv__pane">
      <header class="cv__hd">
        SVG
        <span class="cv__spacer" />
        <label class="cv__w">W
          <input type="number" v-model.number="frameWidth" min="120" max="1400" step="20" />
        </label>
        <label class="cv__w">Mode
          <select v-model="mode"><option>browser</option><option>office</option></select>
        </label>
      </header>

      <SvgPreview
        v-if="!loading"
        class="cv__preview"
        :svg-by-preset="svgByPreset"
        :presets="PRESETS"
        :debug="debug"
        :stats="stats"
        v-model:width="frameWidth"
        :height="0"
        :font-bytes="fontBytes"
        download-name="vyaz-html"
        download-label="Download SVG"
      />
      <div class="cv__loading" v-else>loading fonts…</div>

      <div class="cv__report" v-if="!loading">
        <div class="cv__count">
          {{ tagCount }} tags → <b>{{ tagCount - dropped.length }}</b> converted ·
          <b>{{ warnings.length }}</b> simplified · <b>{{ dropped.length }}</b> dropped
        </div>
        <details v-if="warnings.length" class="cv__list">
          <summary>{{ warnings.length }} simplified</summary>
          <ul><li v-for="(w, i) in warnings" :key="i"><code>{{ w.tag }}</code> {{ w.message }}</li></ul>
        </details>
        <details v-if="dropped.length" class="cv__list">
          <summary>{{ dropped.length }} dropped</summary>
          <ul><li v-for="(d, i) in dropped" :key="i"><code>{{ d.tag }}</code> — {{ d.reason }}</li></ul>
        </details>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { layoutTextFrame } from '@vyaz/core'
import { renderToSVG } from '@vyaz/renderer'
import { htmlToTextFrame } from '@vyaz/html'
import { loadPlaygroundFonts, fontBytes } from '../playground/lib/loadPlaygroundFonts'
import SvgPreview from '../playground/components/SvgPreview.vue'
import HtmlInput from './HtmlInput.vue'
import { SAMPLE_HTML } from './sample'

const PRESETS = ['browser', 'flat', 'preserve', 'glyph'] as const
type Preset = (typeof PRESETS)[number]

const html = ref(SAMPLE_HTML)
const frameWidth = ref(640)
const mode = ref<'browser' | 'office'>('browser')
const loading = ref(true)

// Debug overlays OFF by default — SvgPreview's dropdown turns them on.
const debug = reactive<Record<string, boolean | number>>({})

onMounted(async () => {
  try { await loadPlaygroundFonts() } catch (e) { console.warn('[converter] font load failed', e) }
  loading.value = false
})

const debugFlags = computed(() => {
  const d: Record<string, boolean | number> = {}
  for (const [k, v] of Object.entries(debug)) if (v) d[k] = v
  return Object.keys(d).length ? d : undefined
})

const converted = computed(() => {
  try {
    return htmlToTextFrame(html.value, { width: frameWidth.value, baseFont: { family: 'Arial', size: 16 } })
  } catch (e) {
    return { frame: { wrap: true, paragraphs: [] }, inlineBoxes: {}, warnings: [], dropped: [], error: String(e) } as any
  }
})
const warnings = computed(() => converted.value.warnings)
const dropped = computed(() => converted.value.dropped)

const tagCount = computed(() => {
  if (typeof DOMParser === 'undefined') return 0
  return new DOMParser().parseFromString(html.value, 'text/html').body?.querySelectorAll('*').length ?? 0
})

const layout = computed(() => {
  if (loading.value) return null
  try {
    const t = performance.now()
    const result = layoutTextFrame(converted.value.frame, {
      mode: mode.value, glyphAdvances: true, onMissingFont: 'substitute',
    })
    return { result, ms: Math.round((performance.now() - t) * 100) / 100 }
  } catch (e) {
    console.error('[converter] layout error', e)
    return null
  }
})

const svgByPreset = computed<Record<Preset, string>>(() => {
  const out = {} as Record<Preset, string>
  const l = layout.value
  for (const p of PRESETS) {
    if (!l) { out[p] = ''; continue }
    try {
      out[p] = renderToSVG(l.result, {
        preset: p, contentPadding: 12, debug: debugFlags.value,
        inlineBoxes: converted.value.inlineBoxes,
      } as any)
    } catch (e) {
      out[p] = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="40"><text x="6" y="24" fill="#c00" font-size="12" font-family="monospace">${String(e).slice(0, 90)}</text></svg>`
    }
  }
  return out
})

const stats = computed(() => {
  const l = layout.value
  if (!l) return null
  const r = l.result
  return {
    lines: r.lines.length,
    runs: r.lines.reduce((n, ln) => n + ln.spans.filter((s) => s.type === 'text').length, 0),
    cw: Math.round(r.content.width),
    ch: Math.round(r.content.height),
    overflow: r.overflow.horizontal || r.overflow.vertical,
    ms: l.ms,
    autofit: r.autofit ? r.autofit.scale : null,
    warnings: warnings.value.length,
  }
})
</script>

<style scoped>
.cv { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 22px 0; }
.cv__pane {
  display: flex; flex-direction: column; min-width: 0; height: 680px;
  border: 1px solid var(--vp-c-divider); border-radius: 10px;
  overflow: hidden; background: var(--vp-c-bg);
}
.cv__hd {
  display: flex; align-items: center; gap: 10px;
  padding: 6px 12px; font-size: 11px; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.06em; color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft); border-bottom: 1px solid var(--vp-c-divider);
}
.cv__spacer { flex: 1; }
.cv__w { display: inline-flex; align-items: center; gap: 4px; text-transform: none; letter-spacing: 0; font-weight: 400; }
.cv__w input { width: 54px; }
.cv__preview { flex: 1; min-height: 0; }
.cv__loading { flex: 1; display: grid; place-items: center; color: var(--vp-c-text-3); }

.cv__report {
  border-top: 1px solid var(--vp-c-divider); padding: 8px 12px;
  font-size: 12px; color: var(--vp-c-text-2); max-height: 180px; overflow: auto;
}
.cv__count { font-family: var(--vp-font-family-mono, monospace); margin-bottom: 4px; }
.cv__list summary { cursor: pointer; color: var(--vp-c-text-3); }
.cv__list ul { margin: 4px 0 8px; padding-left: 18px; }
.cv__list li { margin: 2px 0; }
.cv__list code { font-size: 11px; }

@media (max-width: 900px) {
  .cv { grid-template-columns: 1fr; }
  .cv__pane { height: 520px; }
}
</style>
