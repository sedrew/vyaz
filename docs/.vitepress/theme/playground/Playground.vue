<template>
  <div class="vyaz-pg" ref="rootEl" :style="{ '--vyaz-pg-left': leftPct + '%' }">
    <section class="vyaz-pg__pane">
      <header class="vyaz-pg__hd">Editor</header>
      <EditorPanel @update="onEditorUpdate" />
    </section>

    <div
      class="vyaz-pg__split"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize editor / preview"
      tabindex="0"
      @pointerdown="startDrag"
      @keydown="onKey"
      @dblclick="leftPct = 50"
    />

    <section class="vyaz-pg__pane">
      <header class="vyaz-pg__hd">Preview</header>
      <PreviewPanel :prose-json="proseJson" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import EditorPanel from './components/EditorPanel.vue'
import PreviewPanel from './components/PreviewPanel.vue'

const proseJson = ref<unknown>(null)
function onEditorUpdate(json: unknown) {
  proseJson.value = json
}

// ── draggable split between the two panes ───────────────────────────
const rootEl = ref<HTMLElement | null>(null)
const leftPct = ref(50)
const MIN = 28
const MAX = 72
const clamp = (n: number) => Math.max(MIN, Math.min(MAX, n))

function startDrag(e: PointerEvent) {
  const root = rootEl.value
  if (!root) return
  ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  const move = (ev: PointerEvent) => {
    const r = root.getBoundingClientRect()
    leftPct.value = clamp(((ev.clientX - r.left) / r.width) * 100)
  }
  const up = (ev: PointerEvent) => {
    ;(e.target as HTMLElement).releasePointerCapture?.(ev.pointerId)
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    document.body.style.removeProperty('cursor')
  }
  document.body.style.cursor = 'col-resize'
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowLeft') leftPct.value = clamp(leftPct.value - 2)
  else if (e.key === 'ArrowRight') leftPct.value = clamp(leftPct.value + 2)
  else return
  e.preventDefault()
}
</script>

<style scoped>
.vyaz-pg {
  display: grid;
  grid-template-columns: var(--vyaz-pg-left, 50%) 10px 1fr;
  gap: 0;
  margin: 22px 0;
}
.vyaz-pg__pane {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 640px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  overflow: hidden;
  background: var(--vp-c-bg);
}
.vyaz-pg__hd {
  padding: 7px 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}
.vyaz-pg__pane > :deep(*:last-child) { flex: 1; min-height: 0; }

/* drag handle between the panes */
.vyaz-pg__split {
  align-self: stretch;
  cursor: col-resize;
  position: relative;
  touch-action: none;
}
.vyaz-pg__split::before {
  content: '';
  position: absolute;
  inset: 0 4px;
  border-radius: 2px;
  background: var(--vp-c-divider);
  transition: background 0.15s;
}
.vyaz-pg__split:hover::before,
.vyaz-pg__split:focus-visible::before { background: var(--vp-c-brand-1); }
.vyaz-pg__split:focus-visible { outline: none; }

@media (max-width: 900px) {
  .vyaz-pg { grid-template-columns: 1fr; }
  .vyaz-pg__split { display: none; }
  .vyaz-pg__pane { height: 520px; }
}
</style>
