<template>
  <div class="ce" v-if="ready">
    <!-- left: picker + JSON -->
    <div class="ce__left">
      <div class="ce__bar">
        <select v-model="name" class="ce__select">
          <optgroup v-for="g in groups" :key="g.group" :label="g.group">
            <option v-for="c in g.cases" :key="c" :value="c">{{ c.slice(g.group.length + 1) }}</option>
          </optgroup>
        </select>
        <button class="ce__btn" @click="reset" title="Reset JSON to the committed case">↺ reset</button>
        <a class="ce__btn" :href="githubUrl" target="_blank" rel="noopener" title="Open on GitHub">GitHub ↗</a>
      </div>

      <textarea
        class="ce__json"
        :class="{ 'is-bad': !!parseError }"
        v-model="jsonText"
        spellcheck="false"
      />
      <div class="ce__err" v-if="parseError">{{ parseError }}</div>
      <div class="ce__hint" v-else>
        {{ caseCount }} cases · {{ Object.keys(parsed?.renders ?? {}).length }} render variants ·
        rendered with the bundled Roboto / Inter / Great Vibes (test goldens use Unifont — layout matches, glyphs approximate)
      </div>
    </div>

    <!-- right: shared preview -->
    <SvgPreview
      class="ce__right"
      :svg-by-preset="svgByVariant"
      :presets="variants"
      :debug="debug"
      :stats="stats"
      :font-bytes="fontBytes"
      :download-name="downloadName"
    />
  </div>
  <div class="ce ce--loading" v-else>loading…</div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { layoutTextFrame } from '@vyaz/core'
import { renderToSVG } from '@vyaz/renderer'
import { loadPlaygroundFonts, fontBytes } from '../lib/loadPlaygroundFonts'
import SvgPreview from './SvgPreview.vue'

// ── discover cases (build-time glob over the renderer test corpus) ─────
const modules = import.meta.glob(
  '../../../../../packages/renderers/tests/cases/**/input.json',
  { eager: true, import: 'default' },
) as Record<string, any>

/** case names not worth showing here (kept as a plain edit-list) */
const EXCLUDE = new Set<string>([
  // add "group/case" entries to hide them from the picker
])

const CASES: { name: string; input: any }[] = Object.entries(modules)
  .map(([path, input]) => ({
    name: path.replace(/^.*\/cases\//, '').replace(/\/input\.json$/, ''),
    input,
  }))
  // `env: 'arial'` cases have no golden and need the host's system Arial — skip.
  .filter((c) => c.input?.env !== 'arial' && !EXCLUDE.has(c.name))
  .sort((a, b) => a.name.localeCompare(b.name))

const groups = computed(() => {
  const by = new Map<string, string[]>()
  for (const c of CASES) {
    const g = c.name.split('/')[0]
    ;(by.get(g) ?? by.set(g, []).get(g)!).push(c.name)
  }
  return [...by.entries()].map(([group, cases]) => ({ group, cases }))
})
const caseCount = CASES.length

// ── selection + editable JSON ────────────────────────────────────────
const name = ref(CASES[0]?.name ?? '')
const jsonText = ref('')
const debug = reactive<Record<string, boolean | number>>({})

const currentCase = computed(() => CASES.find((c) => c.name === name.value))
function reset() {
  jsonText.value = JSON.stringify(currentCase.value?.input ?? {}, null, 2)
}
// on case change: reload JSON + reseed the debug toggles from the case's own
// render configs, so the dropdown shows exactly what this case draws.
watch(name, () => {
  reset()
  for (const k of Object.keys(debug)) delete debug[k]
  for (const r of Object.values<any>(currentCase.value?.input?.renders ?? {})) {
    for (const [k, v] of Object.entries(r?.debug ?? {})) if (v) debug[k] = v as any
  }
}, { immediate: true })

const parsed = ref<any>(null)
const parseError = ref('')
watch(jsonText, (t) => {
  try {
    parsed.value = JSON.parse(t)
    parseError.value = ''
  } catch (e) {
    parseError.value = String(e)
  }
}, { immediate: true })

const githubUrl = computed(
  () => `https://github.com/sedrew/vyaz/blob/main/packages/renderers/tests/cases/${name.value}/input.json`,
)
const downloadName = computed(() => 'vyaz-' + name.value.replace(/\//g, '-'))

// ── render (mirrors packages/renderers/tests/cases.test.ts) ────────────
const ready = ref(false)
onMounted(async () => {
  try { await loadPlaygroundFonts() } finally { ready.value = true }
})

const variants = computed<string[]>(() => Object.keys(parsed.value?.renders ?? {}))

function renderVariant(profile: string, frame: any, r: any): string {
  const result = layoutTextFrame(frame, {
    glyphAdvances: r?.preset === 'glyph',
    mode: r?.mode,
    shaping: r?.shaping,
    onMissingFont: 'substitute',
  })
  // debug is driven entirely by the shared dropdown (seeded from this case)
  const opts = { ...r, debug: activeDebug() }
  return profile === 'frame-fit'
    ? renderToSVG(result, { ...opts } as any)
    : renderToSVG(result.lines, opts as any)
}
function activeDebug() {
  const d: Record<string, boolean | number> = {}
  for (const [k, v] of Object.entries(debug)) if (v) d[k] = v
  return d
}

const svgByVariant = computed<Record<string, string>>(() => {
  const p = parsed.value
  const out: Record<string, string> = {}
  if (!ready.value || !p?.frame || !p?.renders) return out
  for (const [variant, r] of Object.entries<any>(p.renders)) {
    try {
      out[variant] = renderVariant(p.profile ?? 'raw', p.frame, r)
    } catch (e) {
      out[variant] = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="44"><text x="6" y="26" fill="#c00" font-size="12" font-family="monospace">${String(e).slice(0, 110)}</text></svg>`
    }
  }
  return out
})

const stats = computed(() => {
  const p = parsed.value
  if (!ready.value || !p?.frame) return null
  try {
    const t = performance.now()
    const r = layoutTextFrame(p.frame, { onMissingFont: 'substitute' })
    return {
      lines: r.lines.length,
      runs: r.lines.reduce((n: number, ln: any) => n + ln.spans.filter((s: any) => s.type === 'text').length, 0),
      cw: Math.round(r.content.width),
      ch: Math.round(r.content.height),
      overflow: r.overflow.horizontal || r.overflow.vertical,
      ms: Math.round((performance.now() - t) * 100) / 100,
      autofit: null as number | null,
      warnings: r.warnings?.length ?? 0,
    }
  } catch { return null }
})
</script>

<style scoped>
.ce { display: flex; gap: 0; height: min(72vh, 760px); border: 1px solid var(--vp-c-divider); border-radius: 10px; overflow: hidden; }
.ce--loading { display: grid; place-items: center; color: var(--vp-c-text-3); }

.ce__left { display: flex; flex-direction: column; width: 44%; min-width: 320px; border-right: 1px solid var(--vp-c-divider); }
.ce__right { flex: 1; min-width: 0; }

.ce__bar { display: flex; gap: 6px; align-items: center; padding: 8px 10px; border-bottom: 1px solid var(--vp-c-divider); }
.ce__select { flex: 1; height: 28px; }
.ce__btn {
  padding: 4px 8px; border: 1px solid var(--vp-c-divider); border-radius: 6px;
  background: transparent; color: var(--vp-c-text-2); font-size: 12px; cursor: pointer;
  text-decoration: none; white-space: nowrap;
}
.ce__btn:hover { color: var(--vp-c-text-1); border-color: var(--vp-c-text-3); }

.ce__json {
  flex: 1; margin: 0; padding: 12px; border: 0; resize: none; outline: none;
  font: 12px/1.5 var(--vp-font-family-mono, monospace);
  background: var(--vp-c-bg); color: var(--vp-c-text-1); white-space: pre;
}
.ce__json.is-bad { background: color-mix(in srgb, var(--vp-c-danger-soft, #fdd) 40%, transparent); }
.ce__err {
  padding: 6px 12px; font: 11px/1.4 var(--vp-font-family-mono, monospace);
  color: var(--vp-c-danger-1, #e04); border-top: 1px solid var(--vp-c-divider);
}
.ce__hint {
  padding: 6px 12px; font-size: 11px; color: var(--vp-c-text-3);
  border-top: 1px solid var(--vp-c-divider);
}

@media (max-width: 720px) {
  .ce { flex-direction: column; height: auto; }
  .ce__left { width: auto; border-right: 0; border-bottom: 1px solid var(--vp-c-divider); }
  .ce__json { min-height: 220px; }
}
</style>
