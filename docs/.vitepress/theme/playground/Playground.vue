<template>
  <div class="vyaz-pg">
    <section class="vyaz-pg__pane">
      <header class="vyaz-pg__hd">Editor</header>
      <EditorPanel @update="onEditorUpdate" />
    </section>
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
</script>

<style scoped>
.vyaz-pg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
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

@media (max-width: 900px) {
  .vyaz-pg { grid-template-columns: 1fr; }
  .vyaz-pg__pane { height: 520px; }
}
</style>
