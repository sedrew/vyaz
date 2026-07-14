<template>
  <div class="preview-panel">
    <div class="preview-header">
      <h2>SVG Preview</h2>
    </div>
    <div class="preview-controls">
      <div class="control-group">
        <label>Width</label>
        <input type="number" v-model.number="frameWidth" min="100" max="1200" step="10" />
      </div>
      <div class="control-group">
        <label>Height</label>
        <input type="number" v-model.number="frameHeight" min="0" max="1200" step="10" placeholder="auto" />
      </div>
      <div class="control-group">
        <label>Alignment</label>
        <select v-model="alignment">
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
          <option value="justify">Justify</option>
        </select>
      </div>
    </div>
    <div class="preview-controls debug-controls">
      <span class="debug-label">Debug:</span>
      <label class="debug-checkbox">
        <input type="checkbox" v-model="debug.frameBox" />
        <span>TextFrame</span>
      </label>
      <label class="debug-checkbox">
        <input type="checkbox" v-model="debug.contentBox" />
        <span>ContentBox</span>
      </label>
      <label class="debug-checkbox">
        <input type="checkbox" v-model="debug.box" />
        <span>Box</span>
      </label>
      <label class="debug-checkbox">
        <input type="checkbox" v-model="debug.baseline" />
        <span>Baseline</span>
      </label>
      <label class="debug-checkbox">
        <input type="checkbox" v-model="debug.ascentDescent" />
        <span>Ascent/Descent</span>
      </label>
      <label class="debug-checkbox">
        <input type="checkbox" v-model="debug.labels" />
        <span>Labels</span>
      </label>
      <label class="debug-checkbox">
        <input type="checkbox" v-model="debug.runs" />
        <span>Runs</span>
      </label>
      <label class="debug-checkbox">
        <input type="checkbox" v-model="debug.lineGap" />
        <span>LineGap</span>
      </label>
    </div>
    <div class="preview-canvas" ref="canvasRef">
      <div v-if="loading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <p>Loading fonts…</p>
      </div>
      <div v-else-if="svgString" v-html="svgString" class="svg-output"></div>
      <div v-else class="preview-empty">
        <p>No content to render</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { layoutTextFrame, fontMetricsProvider } from '@vyaz/core'
import { renderToSVG } from '@vyaz/renderer'
import type { DebugFlags } from '@vyaz/renderer'
import { proseMirrorToVyaz } from '../lib/proseMirrorToVyaz'

const props = defineProps<{
  proseJson: unknown
}>()

const canvasRef = ref<HTMLElement | null>(null)
const frameWidth = ref(600)
const frameHeight = ref(0)
const alignment = ref<'left' | 'center' | 'right' | 'justify'>('left')
const loading = ref(true)

const debug = reactive<DebugFlags>({
  frameBox: true,
  contentBox: false,
  box: false,
  baseline: false,
  ascentDescent: false,
  labels: false,
  runs: false,
  lineGap: false,
})

/** Google Fonts CSS URL for fonts used in this demo */
const GOOGLE_FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Lora:wght@400;700&family=Open+Sans:wght@400;700&family=Merriweather:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap'

interface FontJob {
  family: string
  weight: string
  style: string
  url: string
}

interface LoadedFont {
  family: string
  weight: string
  style: string
  buffer: Uint8Array
}

/**
 * Загружает Google Fonts CSS, парсит его силами самого браузера,
 * скачивает файлы шрифтов и возвращает массив готовых объектов с буферами.
 */
async function fetchAndParseFonts(googleFontsUrl: string): Promise<LoadedFont[]> {
  const cssResponse = await fetch(googleFontsUrl)
  if (!cssResponse.ok) throw new Error(`CSS fetch failed: ${cssResponse.status}`)
  const cssText = await cssResponse.text()

  const sheet = new CSSStyleSheet()
  await sheet.replace(cssText)

  const fontJobs: FontJob[] = []

  for (const rule of sheet.cssRules) {
    if (rule.constructor.name === 'CSSFontFaceRule' || rule.type === 4) {
      const style = (rule as CSSFontFaceRule).style

      const family = style.getPropertyValue('font-family').replace(/['"]/g, '').trim()
      let weight = style.getPropertyValue('font-weight').trim() || '400'
      const fontStyle = style.getPropertyValue('font-style').trim() || 'normal'
      const src = style.getPropertyValue('src')

      // Нормализуем веса
      if (weight === 'normal') weight = '400'
      if (weight === 'bold') weight = '700'

      const urlMatch = src.match(/url\(['"]?([^'"]+?)['"]?\)/)
      if (urlMatch && urlMatch[1]) {
        fontJobs.push({ family, weight, style: fontStyle, url: urlMatch[1] })
      }
    }
  }

  // Скачиваем бинарники параллельно
  const loadedFonts = await Promise.all(
    fontJobs.map(async (font) => {
      try {
        const res = await fetch(font.url)
        if (!res.ok) throw new Error(`Font file fetch failed: ${res.status}`)
        const arrayBuffer = await res.arrayBuffer()
        return {
          family: font.family,
          weight: font.weight,
          style: font.style,
          buffer: new Uint8Array(arrayBuffer),
        }
      } catch {
        return null
      }
    }),
  )

  return loadedFonts.filter(Boolean) as LoadedFont[]
}

/**
 * Register a font under one family/weight/style key.
 */
async function register(family: string, weight: string, style: string, buffer: Uint8Array): Promise<void> {
  await fontMetricsProvider.registerFont(family, { weight, style }, buffer)
}

onMounted(async () => {
  try {
    const loaded = await fetchAndParseFonts(GOOGLE_FONTS_URL)
    console.log(`[vyaz demo] Downloaded ${loaded.length} fonts`)

    const seenUrl = new Set<string>()

    for (const f of loaded) {
      const key = `${f.family}_${f.weight}_${f.style}`
      if (seenUrl.has(key)) continue
      seenUrl.add(key)

      // Register under original family
      await register(f.family, f.weight, f.style, f.buffer)

      // Fallback weights & styles for browser
      const allWeights = ['400', '700']
      const allStyles = ['normal', 'italic']
      const aliases = [
        f.family,
        'Arial',
        'Helvetica',
        'Times New Roman',
        'Georgia',
        'Courier New',
        'Verdana',
        'Trebuchet MS',
        'Impact',
      ]

      for (const w of allWeights) {
        for (const s of allStyles) {
          for (const alias of aliases) {
            await register(alias, w, s, f.buffer)
          }
        }
      }

      // JetBrains Mono → alias "monospace" for code blocks
      if (f.family === 'JetBrains Mono') {
        for (const w of allWeights) {
          for (const s of allStyles) {
            await register('monospace', w, s, f.buffer)
          }
        }
      }
    }

    console.log('[vyaz demo] Fonts registered, engine ready')
  } catch (err) {
    console.warn('[vyaz demo] Font loading failed, fallback to Canvas:', err)
  } finally {
    loading.value = false
  }
})

const svgString = computed(() => {
  if (loading.value) return ''

  const doc = props.proseJson as any
  if (!doc || doc.type !== 'doc') return ''

  try {
    const effectiveHeight = frameHeight.value > 0 ? frameHeight.value : undefined

    const textFrame = proseMirrorToVyaz(doc, {
      width: frameWidth.value,
      height: effectiveHeight,
      alignment: alignment.value,
    })

    const result = layoutTextFrame(textFrame)

    const hasDebug = Object.values(debug).some(v => v)

    const svg = renderToSVG(result.lines, {
      width: result.fitHorizontal === 'frame' ? result.frameWidth : result.contentWidth,
      height: result.fitVertical === 'frame' ? result.frameHeight : result.contentHeight,
      preset: 'browser',
      debug: hasDebug ? { ...debug } : undefined,
    })

    return svg
  } catch (err) {
    console.error('Vyaz render error:', err)
    return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="50">
      <text x="10" y="30" font-family="monospace" font-size="14" fill="red">Render Error: ${String(err)}</text>
    </svg>`
  }
})
</script>

<style scoped>
.preview-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.preview-header {
  padding: 10px 14px;
  border-bottom: 1px solid #e0e0e0;
  background: #fafafa;
}

.preview-header h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.preview-controls {
  display: flex;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid #e0e0e0;
  background: #fff;
  flex-wrap: wrap;
}

.control-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.control-group label {
  font-size: 12px;
  font-weight: 500;
  color: #666;
}

.control-group input,
.control-group select {
  padding: 4px 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 13px;
  width: 80px;
  outline: none;
}

.control-group input:focus,
.control-group select:focus {
  border-color: #4a90d9;
  box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.15);
}

/* ── Debug controls ─────────────────────────────── */

.debug-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: #f9f9f9;
  border-bottom: 1px solid #e0e0e0;
  flex-wrap: wrap;
}

.debug-label {
  font-size: 11px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.debug-checkbox {
  display: flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  font-size: 12px;
  color: #555;
  user-select: none;
}

.debug-checkbox input[type="checkbox"] {
  margin: 0;
  accent-color: #2563eb;
}

.debug-checkbox:hover {
  color: #111;
}

/* ── Preview canvas ─────────────────────────────── */

.preview-canvas {
  flex: 1;
  overflow: auto;
  padding: 16px;
  background: #f5f5f5;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}

.loading-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #999;
  font-size: 14px;
  gap: 12px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e0e0e0;
  border-top: 3px solid #4a90d9;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.svg-output {
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  padding: 8px;
  max-width: 100%;
}

.svg-output :deep(svg) {
  display: block;
  max-width: 100%;
  height: auto;
}

.preview-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #999;
  font-size: 14px;
}
</style>