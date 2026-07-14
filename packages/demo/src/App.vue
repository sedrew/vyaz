<template>
  <div class="app-container">
    <div class="app-left">
      <EditorPanel @update="onEditorUpdate" />
    </div>
    <div class="app-right">
      <PreviewPanel :prose-json="proseJson" />
    </div>
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
.app-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.app-left {
  flex: 1;
  min-width: 300px;
  max-width: 50%;
  overflow: hidden;
}

.app-right {
  flex: 1;
  min-width: 300px;
  overflow: hidden;
}
</style>