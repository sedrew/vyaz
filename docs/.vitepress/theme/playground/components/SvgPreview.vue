<template>
  <div class="sp">
    <!-- presets + actions -->
    <div class="sp__toolbar">
      <div class="sp__tabs">
        <button
          v-for="p in presets" :key="p"
          class="sp__tab" :class="{ 'is-active': active === p }"
          @click="active = p"
        >{{ p }}</button>
      </div>

      <span class="sp__spacer" />

      <div class="sp__menu" ref="menuEl">
        <button class="sp__btn" :class="{ 'is-on': activeCount > 0 }" @click="menuOpen = !menuOpen" title="Debug overlays">
          <IconBug :size="16" :stroke="1.75" /> debug<span v-if="activeCount" class="sp__badge">{{ activeCount }}</span>
          <IconChevronDown :size="13" :stroke="2" />
        </button>
        <div v-if="menuOpen" class="sp__pop">
          <label v-for="k in DEBUG_FLAGS" :key="k" :class="{ 'is-on': !!debug[k] }">
            <input type="checkbox" :checked="!!debug[k]" @change="setFlag(k, ($event.target as HTMLInputElement).checked)" />
            <span class="sp__dot" />{{ k }}
          </label>
        </div>
      </div>

      <button class="sp__btn" :class="{ 'is-on': showCode }" @click="showCode = !showCode" title="Show SVG source">
        <IconCode :size="16" :stroke="1.75" /> code
      </button>

      <button class="sp__btn" @click="download" title="Download self-contained SVG">
        <IconDownload :size="16" :stroke="1.75" />
      </button>
    </div>

    <!-- stats -->
    <div class="sp__stats" v-if="stats">
      {{ stats.lines }} lines · {{ stats.runs }} runs ·
      content {{ stats.cw }}×{{ stats.ch }} ·
      <span :class="{ 'is-over': stats.overflow }">{{ stats.overflow ? 'OVERFLOW' : 'fits' }}</span>
      · {{ stats.ms }} ms
      <template v-if="stats.autofit"> · scale {{ stats.autofit }}</template>
      <template v-if="stats.warnings"> · ⚠ {{ stats.warnings }}</template>
    </div>

    <!-- view -->
    <div class="sp__view">
      <pre v-if="showCode" class="sp__code"><code>{{ currentSvg }}</code></pre>
      <div v-else class="sp__canvas" ref="canvasEl">
        <div class="sp__svg" v-html="currentSvg" />
        <template v-if="resizable">
          <span class="sp__h sp__h--e" @pointerdown.prevent="startResize($event, 'e')" title="Drag width" />
          <span class="sp__h sp__h--s" @pointerdown.prevent="startResize($event, 's')" title="Drag height" />
          <span class="sp__h sp__h--se" @pointerdown.prevent="startResize($event, 'se')" title="Drag width + height" />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { IconBug, IconCode, IconDownload, IconChevronDown } from '@tabler/icons-vue'

interface Stats {
  lines: number; runs: number; cw: number; ch: number
  overflow: boolean; ms: number; autofit: number | null; warnings: number
}

const props = withDefaults(defineProps<{
  svgByPreset: Record<string, string>
  presets: readonly string[]
  /** reactive flag bag, mutated in place; also drives which items show "active" */
  debug: Record<string, boolean | number>
  stats?: Stats | null
  /** frame dims — when both given, resize handles are shown */
  width?: number
  height?: number
  downloadName?: string
  /** family → raw bytes, for @font-face inlining in the download */
  fontBytes?: Map<string, Uint8Array>
}>(), { stats: null, downloadName: 'vyaz' })

const emit = defineEmits<{ 'update:width': [number]; 'update:height': [number] }>()

// every DebugFlags key (numeric `widthBorder` excluded — it's not a toggle)
const DEBUG_FLAGS = [
  'frameBox', 'contentBox', 'paragraphBox', 'box', 'baseline',
  'ascentDescent', 'lineGap', 'runs', 'labels', 'columnBox',
] as const

const active = ref<string>(props.presets.includes('browser') ? 'browser' : props.presets[0])
watch(() => props.presets, (ps) => { if (!ps.includes(active.value)) active.value = ps[0] })

const currentSvg = computed(() => props.svgByPreset[active.value] ?? props.svgByPreset[props.presets[0]] ?? '')
const activeCount = computed(() => DEBUG_FLAGS.filter((k) => props.debug[k]).length)
const resizable = computed(() => props.width != null && props.height != null)

function setFlag(k: string, on: boolean) { props.debug[k] = on }

// ── debug popover: close on outside click ─────────────────────────────
const menuEl = ref<HTMLElement | null>(null)
const menuOpen = ref(false)
const showCode = ref(false)
function onDocClick(e: MouseEvent) {
  if (menuOpen.value && menuEl.value && !menuEl.value.contains(e.target as Node)) menuOpen.value = false
}
onMounted(() => document.addEventListener('mousedown', onDocClick))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick))

// ── resize handles ───────────────────────────────────────────────────
const canvasEl = ref<HTMLElement | null>(null)
type Edge = 'e' | 's' | 'se'
function startResize(ev: PointerEvent, edge: Edge) {
  const svg = canvasEl.value?.querySelector('svg') as SVGSVGElement | null
  if (!svg) return
  const rect = svg.getBoundingClientRect()
  const scale = rect.width / (svg.width.baseVal.value || rect.width) // px shown per SVG unit
  const sx = ev.clientX, sy = ev.clientY
  const sw = props.width!, sh = props.height! > 0 ? props.height! : Math.round(props.stats?.ch ?? rect.height / scale)
  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)))
  const move = (e: PointerEvent) => {
    if (edge !== 's') emit('update:width', clamp(sw + (e.clientX - sx) / scale, 80, 1400))
    if (edge !== 'e') emit('update:height', clamp(sh + (e.clientY - sy) / scale, 20, 1400))
  }
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    document.body.style.removeProperty('cursor')
  }
  document.body.style.cursor = edge === 'e' ? 'ew-resize' : edge === 's' ? 'ns-resize' : 'nwse-resize'
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}

// ── download: self-contained SVG (used @font-face bytes inlined) ───────
const b64cache = new Map<string, string>()
function toBase64(bytes: Uint8Array): string {
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  return btoa(bin)
}
function download() {
  let svg = currentSvg.value
  if (!svg) return
  const bytesMap = props.fontBytes
  if (bytesMap) {
    const families = new Set([...svg.matchAll(/font-family="([^"]+)"/g)].map((m) => m[1]))
    const faces: string[] = []
    for (const fam of families) {
      const bytes = bytesMap.get(fam)
      if (!bytes) continue
      let b64 = b64cache.get(fam)
      if (!b64) b64cache.set(fam, (b64 = toBase64(bytes)))
      faces.push(`@font-face{font-family:${JSON.stringify(fam)};font-weight:1 1000;src:url(data:font/ttf;base64,${b64}) format("truetype")}`)
    }
    if (faces.length) svg = svg.replace(/(<svg\b[^>]*>)/, `$1<defs><style>${faces.join('')}</style></defs>`)
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  a.download = `${props.downloadName}-${active.value}.svg`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
</script>

<style scoped>
.sp { display: flex; flex-direction: column; height: 100%; overflow: hidden; }

.sp__toolbar {
  display: flex; align-items: center; gap: 6px;
  padding: 5px 10px; border-bottom: 1px solid var(--vp-c-divider);
}
.sp__spacer { flex: 1; }

.sp__tabs { display: flex; gap: 2px; flex-wrap: wrap; }
.sp__tab {
  padding: 4px 10px; border: 1px solid transparent; border-radius: 6px;
  background: transparent; cursor: pointer;
  font: 12px/1 var(--vp-font-family-mono, monospace); color: var(--vp-c-text-3);
}
.sp__tab:hover { color: var(--vp-c-text-1); }
.sp__tab.is-active { color: var(--vp-c-brand-1); background: var(--vp-c-bg-soft); border-color: var(--vp-c-divider); }

.sp__btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 8px; border: 1px solid var(--vp-c-divider); border-radius: 6px;
  background: transparent; cursor: pointer; color: var(--vp-c-text-2);
  font-size: 12px; line-height: 1;
}
.sp__btn:hover { color: var(--vp-c-text-1); border-color: var(--vp-c-text-3); }
.sp__btn.is-on { color: var(--vp-c-brand-1); border-color: var(--vp-c-brand-1); }
.sp__badge {
  min-width: 15px; padding: 0 3px; border-radius: 8px; text-align: center;
  background: var(--vp-c-brand-1); color: #fff; font-size: 10px; line-height: 15px;
}

.sp__menu { position: relative; }
.sp__pop {
  position: absolute; right: 0; top: calc(100% + 4px); z-index: 20;
  display: flex; flex-direction: column; gap: 4px;
  padding: 8px 10px; min-width: 150px;
  background: var(--vp-c-bg); border: 1px solid var(--vp-c-divider);
  border-radius: 8px; box-shadow: 0 6px 20px rgba(0, 0, 0, .12); font-size: 12px;
}
.sp__pop label { display: flex; align-items: center; gap: 6px; cursor: pointer; color: var(--vp-c-text-3); }
.sp__pop label.is-on { color: var(--vp-c-text-1); font-weight: 600; }
.sp__dot { width: 6px; height: 6px; border-radius: 50%; background: transparent; }
.sp__pop label.is-on .sp__dot { background: var(--vp-c-brand-1); }

.sp__stats {
  padding: 6px 12px; font: 11px/1.4 var(--vp-font-family-mono, monospace);
  color: var(--vp-c-text-2); border-bottom: 1px solid var(--vp-c-divider);
}
.sp__stats .is-over { color: var(--vp-c-danger-1, #e04); font-weight: 600; }

.sp__view { flex: 1; overflow: auto; padding: 16px; }
.sp__canvas { position: relative; display: inline-block; max-width: 100%; }
.sp__svg :deep(svg) { display: block; max-width: 100%; height: auto; background: #fff; box-shadow: 0 0 0 1px var(--vp-c-divider); }

.sp__h { position: absolute; z-index: 5; background: var(--vp-c-brand-1); opacity: 0; transition: opacity .12s; }
.sp__canvas:hover .sp__h { opacity: .35; }
.sp__h:hover { opacity: .9 !important; }
.sp__h--e { top: 0; right: -3px; width: 6px; height: 100%; cursor: ew-resize; }
.sp__h--s { left: 0; bottom: -3px; height: 6px; width: 100%; cursor: ns-resize; }
.sp__h--se { right: -5px; bottom: -5px; width: 12px; height: 12px; border-radius: 2px; cursor: nwse-resize; }

.sp__code {
  margin: 0; padding: 12px; height: 100%; overflow: auto;
  font: 11px/1.5 var(--vp-font-family-mono, monospace);
  background: var(--vp-c-bg-soft); border: 1px solid var(--vp-c-divider); border-radius: 8px;
  white-space: pre; color: var(--vp-c-text-1);
}
</style>
