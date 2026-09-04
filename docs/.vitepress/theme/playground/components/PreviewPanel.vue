<template>
  <div class="rp">
    <!-- frame controls -->
    <div class="rp__bar">
      <label>W <input type="number" v-model.number="frameWidth" min="80" max="1400" step="10" /></label>
      <label>H <input type="number" v-model.number="frameHeight" min="0" max="1400" step="10" placeholder="auto" /></label>
      <label>Pad <input type="number" v-model.number="pad" min="0" max="80" step="2" /></label>
      <label>Mode
        <select v-model="mode"><option>browser</option><option>office</option></select>
      </label>
      <label class="rp__autofit"><input type="checkbox" v-model="autofit" /> autofit</label>
    </div>

    <SvgPreview
      v-if="!loading"
      class="rp__preview"
      :svg-by-preset="svgByPreset"
      :presets="PRESETS"
      :debug="debug"
      :stats="stats"
      v-model:width="frameWidth"
      v-model:height="frameHeight"
      :font-bytes="fontBytes"
      download-name="vyaz"
    />
    <div class="rp__loading" v-else>loading fonts…</div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { layoutTextFrame } from '@vyaz/core'
import type { TextFrameLayoutResult } from '@vyaz/core'
import { renderToSVG } from '@vyaz/renderer'
import { proseMirrorToVyaz } from '../lib/proseMirrorToVyaz'
import { loadPlaygroundFonts, fontBytes } from '../lib/loadPlaygroundFonts'
import SvgPreview from './SvgPreview.vue'

const props = defineProps<{ proseJson: unknown }>()

const PRESETS = ['flat', 'browser', 'preserve', 'glyph'] as const
type Preset = (typeof PRESETS)[number]

const frameWidth = ref(420)
const frameHeight = ref(0)
const pad = ref(0)
const mode = ref<'browser' | 'office'>('browser')
const autofit = ref(false)
const loading = ref(true)

// default-on overlays; SvgPreview's dropdown adds/removes the rest
const debug = reactive<Record<string, boolean | number>>({ frameBox: true, contentBox: true })

onMounted(async () => {
  try { await loadPlaygroundFonts() } catch (e) { console.warn('[playground] font load failed', e) }
  loading.value = false
})

const debugFlags = computed(() => {
  const d: Record<string, boolean | number> = {}
  for (const [k, v] of Object.entries(debug)) if (v) d[k] = v
  return Object.keys(d).length ? d : undefined
})

const layout = computed<{ result: TextFrameLayoutResult; ms: number } | null>(() => {
  if (loading.value) return null
  const doc = props.proseJson as any
  if (!doc || doc.type !== 'doc') return null
  try {
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

const svgByPreset = computed<Record<Preset, string>>(() => {
  const out = {} as Record<Preset, string>
  const l = layout.value
  for (const p of PRESETS) {
    if (!l) { out[p] = ''; continue }
    try {
      out[p] = renderToSVG(l.result, { preset: p, contentPadding: 10, debug: debugFlags.value } as any)
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
  padding: 7px 12px; border-bottom: 1px solid var(--vp-c-divider);
  font-size: 12px; color: var(--vp-c-text-2);
}
.rp__bar label { display: inline-flex; gap: 5px; align-items: center; }
.rp__bar input[type='number'] { width: 56px; }
.rp__autofit { margin-left: auto; }
.rp__preview { flex: 1; min-height: 0; }
.rp__loading { flex: 1; display: grid; place-items: center; color: var(--vp-c-text-3); }
</style>
