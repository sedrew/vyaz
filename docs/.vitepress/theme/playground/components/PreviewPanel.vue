<template>
  <div class="rp">
    <div class="rp__bar">
      <label>Width <input type="number" v-model.number="frameWidth" min="80" max="1400" step="10" /></label>
      <label>Height <input type="number" v-model.number="frameHeight" min="0" max="1400" step="10" placeholder="auto" /></label>
      <label>Pad <input type="number" v-model.number="pad" min="0" max="80" step="2" /></label>
      <label>Mode
        <select v-model="mode"><option>browser</option><option>office</option></select>
      </label>
      <span class="rp__spacer" />
      <label class="rp__autofit"><input type="checkbox" v-model="autofit" /> autofit</label>
    </div>

    <div class="rp__bar rp__bar--debug">
      <span class="rp__dbg-label">debug</span>
      <label v-for="k in DEBUG_KEYS" :key="k"><input type="checkbox" v-model="debug[k]" /> {{ k }}</label>
    </div>

    <div class="rp__stats" v-if="stats">
      {{ stats.lines }} lines · {{ stats.runs }} runs ·
      content {{ stats.cw }}×{{ stats.ch }} ·
      <span :class="{ 'is-over': stats.overflow }">{{ stats.overflow ? 'OVERFLOW' : 'fits' }}</span>
      · {{ stats.ms }} ms
      <template v-if="stats.autofit"> · scale {{ stats.autofit }}</template>
      <template v-if="stats.warnings"> · ⚠ {{ stats.warnings }}</template>
    </div>

    <div class="rp__tabs">
      <button
        v-for="p in PRESETS" :key="p"
        class="rp__tab" :class="{ 'is-active': activePreset === p }"
        @click="activePreset = p"
      >{{ p }}</button>
    </div>

    <div class="rp__view" v-if="!loading">
      <div class="rp__svg" v-html="svgByPreset[activePreset]" />
    </div>
    <div class="rp__loading" v-else>loading fonts…</div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { layoutTextFrame, fontMetricsProvider } from '@vyaz/core'
import type { TextFrameLayoutResult } from '@vyaz/core'
import { renderToSVG } from '@vyaz/renderer'
import { proseMirrorToVyaz } from '../lib/proseMirrorToVyaz'

const props = defineProps<{ proseJson: unknown }>()

const PRESETS = ['flat', 'browser', 'preserve', 'glyph'] as const
type Preset = (typeof PRESETS)[number]
const DEBUG_KEYS = ['frameBox', 'contentBox', 'baseline', 'box'] as const

const frameWidth = ref(420)
const frameHeight = ref(0)
const pad = ref(0)
const mode = ref<'browser' | 'office'>('browser')
const autofit = ref(false)
const activePreset = ref<Preset>('browser')
const debug = reactive<Record<string, boolean>>({ frameBox: true, contentBox: true, baseline: false, box: false })
const loading = ref(true)

// ── fonts ───────────────────────────────────────────────────────────────
const FONT_CSS =
  'https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,700;1,400;1,700&family=Lora:ital,wght@0,400;0,700;1,400&family=Open+Sans:wght@400;700&family=Merriweather:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap'

async function loadFonts() {
  const css = await (await fetch(FONT_CSS)).text()
  const sheet = new CSSStyleSheet()
  await sheet.replace(css)
  const jobs: { family: string; weight: string; style: string; url: string }[] = []
  for (const rule of sheet.cssRules as any) {
    if (rule.type !== 5 && rule.constructor.name !== 'CSSFontFaceRule') continue
    const s = (rule as CSSFontFaceRule).style
    const family = s.getPropertyValue('font-family').replace(/['"]/g, '').trim()
    let weight = (s.getPropertyValue('font-weight').trim() || '400').replace('normal', '400').replace('bold', '700')
    const style = s.getPropertyValue('font-style').trim() || 'normal'
    const url = s.getPropertyValue('src').match(/url\(['"]?([^'")]+)/)?.[1]
    if (url) jobs.push({ family, weight, style, url })
  }
  const ALIAS = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana']
  for (const j of jobs) {
    const buf = new Uint8Array(await (await fetch(j.url)).arrayBuffer())
    for (const fam of [j.family, ...ALIAS]) {
      try { await fontMetricsProvider.registerFont(fam, { weight: j.weight, style: j.style }, buf) } catch {}
    }
    if (j.family === 'JetBrains Mono') {
      try { await fontMetricsProvider.registerFont('monospace', { weight: j.weight, style: j.style }, buf) } catch {}
    }
  }
}

onMounted(async () => {
  try { await loadFonts() } catch (e) { console.warn('[playground] font load failed', e) }
  loading.value = false
})

// ── layout ─────────────────────────────────────────────────────────────
const layout = computed<{ result: TextFrameLayoutResult; ms: number } | null>(() => {
  if (loading.value) return null
  const doc = props.proseJson as any
  if (!doc || doc.type !== 'doc') return null
  try {
    // no `alignment` override — per-paragraph textAlign from the editor wins
    const frame = proseMirrorToVyaz(doc, {
      width: frameWidth.value,
      height: frameHeight.value > 0 ? frameHeight.value : undefined,
      padding: pad.value > 0
        ? { top: pad.value, right: pad.value, bottom: pad.value, left: pad.value }
        : undefined,
    })
    const t = performance.now()
    const result = layoutTextFrame(frame, {
      mode: mode.value,
      glyphAdvances: true,
      onMissingFont: 'substitute',
      autofit: autofit.value ? { minFontSize: 6 } : undefined,
    })
    return { result, ms: Math.round((performance.now() - t) * 100) / 100 }
  } catch (e) {
    console.error('[playground] layout error', e)
    return null
  }
})

const debugFlags = computed(() => {
  const d: Record<string, boolean> = {}
  for (const k of DEBUG_KEYS) if (debug[k]) d[k] = true
  return Object.keys(d).length ? d : undefined
})

const svgByPreset = computed<Record<Preset, string>>(() => {
  const out = {} as Record<Preset, string>
  const l = layout.value
  for (const p of PRESETS) {
    if (!l) { out[p] = ''; continue }
    try {
      // no explicit sizing → renderToSVG derives it from the result:
      // frame.width is always set here, so the SVG is the full frame and
      // alignment (center/right/justify) is visible.
      out[p] = renderToSVG(l.result, {
        preset: p,
        contentPadding: 10,
        debug: debugFlags.value,
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
    warnings: r.warnings?.length ?? 0,
  }
})
</script>

<style scoped>
.rp { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
.rp__bar {
  display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
  padding: 8px 12px; border-bottom: 1px solid var(--vp-c-divider);
  font-size: 12px; color: var(--vp-c-text-2);
}
.rp__bar label { display: inline-flex; gap: 5px; align-items: center; }
.rp__bar input[type='number'] { width: 62px; }
.rp__bar--debug { gap: 12px; }
.rp__spacer { flex: 1; }
.rp__dbg-label { text-transform: uppercase; letter-spacing: .05em; opacity: .6; }
.rp__stats {
  padding: 6px 12px; font: 11px/1.4 var(--vp-font-family-mono, monospace);
  color: var(--vp-c-text-2); border-bottom: 1px solid var(--vp-c-divider);
}
.rp__stats .is-over { color: var(--vp-c-danger-1, #e04); font-weight: 600; }
.rp__tabs { display: flex; gap: 2px; padding: 6px 10px 0; border-bottom: 1px solid var(--vp-c-divider); }
.rp__tab {
  padding: 5px 12px; border: 1px solid transparent; border-bottom: none;
  border-radius: 6px 6px 0 0; background: transparent; cursor: pointer;
  font: 12px/1 var(--vp-font-family-mono, monospace); color: var(--vp-c-text-3);
}
.rp__tab:hover { color: var(--vp-c-text-1); }
.rp__tab.is-active {
  color: var(--vp-c-brand-1); background: var(--vp-c-bg);
  border-color: var(--vp-c-divider); border-bottom-color: var(--vp-c-bg);
  margin-bottom: -1px;
}
.rp__view { flex: 1; overflow: auto; padding: 16px; }
.rp__svg :deep(svg) { max-width: 100%; height: auto; background: #fff; box-shadow: 0 0 0 1px var(--vp-c-divider); }
.rp__loading { flex: 1; display: grid; place-items: center; color: var(--vp-c-text-3); }
</style>
