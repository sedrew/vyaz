<template>
  <div class="ps">
    <pre class="ps__code"><code><template v-for="(line, i) in info.snippet" :key="i"><span
        v-for="(tok, j) in line" :key="j" :class="tok.k ? 'ps__' + tok.k : null"
      >{{ tok.v }}</span>{{ i < info.snippet.length - 1 ? '\n' : '' }}</template></code></pre>
    <p class="ps__callout">{{ info.callout }}</p>
  </div>
</template>

<script setup lang="ts">
import type { PresetInfo } from '../lib/presetInfo'
defineProps<{ info: PresetInfo }>()
</script>

<style scoped>
.ps__code {
  margin: 0;
  padding: 12px 14px;
  border-radius: 8px;
  overflow-x: auto;
  background: #14110f;
  color: #e9e2d7;
  font: 500 12px/1.7 var(--vp-font-family-mono, monospace);
  white-space: pre;
  tab-size: 2;
}
.ps__code code { font: inherit; background: none; padding: 0; }
.ps__punct { color: #b9682f; }
.ps__dim { color: #8b8175; }
.ps__cmt { color: #8b8175; font-style: italic; }
.ps__hl {
  background: rgba(226, 132, 92, 0.26);
  color: #ffdcc4;
  border-radius: 3px;
  padding: 1px 3px;
  box-shadow: inset 0 -2px 0 #e8a075;
}
.ps__callout {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 9px 0 0;
  font: 500 11px/1.4 var(--vp-font-family-mono, monospace);
  color: var(--vp-c-brand-1);
}
.ps__callout::before {
  content: '';
  width: 14px;
  height: 8px;
  flex: none;
  border-left: 2px solid #e8a075;
  border-bottom: 2px solid #e8a075;
  border-bottom-left-radius: 4px;
  transform: translateY(-3px);
}
</style>
