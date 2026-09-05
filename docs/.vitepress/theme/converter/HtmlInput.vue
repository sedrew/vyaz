<template>
  <div class="hi">
    <div class="hi__tabs">
      <button class="hi__tab" :class="{ 'is-active': tab === 'code' }" @click="tab = 'code'">Code</button>
      <button class="hi__tab" :class="{ 'is-active': tab === 'preview' }" @click="tab = 'preview'">Preview</button>
      <span class="hi__spacer" />
      <span class="hi__hint">{{ model.length }} chars</span>
    </div>

    <textarea
      v-show="tab === 'code'"
      class="hi__code"
      spellcheck="false"
      :value="model"
      @input="onInput"
      :placeholder="format === 'markdown' ? 'Paste a Markdown document…' : 'Paste an HTML fragment…'"
    />

    <iframe
      v-show="tab === 'preview'"
      class="hi__frame"
      sandbox=""
      :srcdoc="srcdoc"
      title="Preview"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { marked } from 'marked'

const props = defineProps<{ modelValue: string; format?: 'html' | 'markdown' }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const tab = ref<'code' | 'preview'>('code')
const model = computed(() => props.modelValue)

let t: ReturnType<typeof setTimeout> | undefined
function onInput(e: Event) {
  const v = (e.target as HTMLTextAreaElement).value
  clearTimeout(t)
  t = setTimeout(() => emit('update:modelValue', v), 200)
}

// Preview: the raw fragment (or, for Markdown, the same `marked` HTML the
// converter itself runs on) on a plain white page. sandbox="" blocks
// scripts, forms, popups — it is only a visual reference for the source.
const bodyHtml = computed(() =>
  props.format === 'markdown' ? (marked.parse(props.modelValue, { gfm: true, async: false }) as string) : props.modelValue,
)
const srcdoc = computed(
  () =>
    `<!doctype html><meta charset="utf-8"><style>` +
    `html{font:16px/1.5 system-ui,Arial,sans-serif;color:#111;background:#fff;padding:16px}` +
    `img{max-width:100%}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px}` +
    `</style>${bodyHtml.value}`,
)
</script>

<style scoped>
.hi { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
.hi__tabs {
  display: flex; align-items: center; gap: 2px;
  padding: 5px 10px; border-bottom: 1px solid var(--vp-c-divider);
}
.hi__spacer { flex: 1; }
.hi__hint { font: 11px/1 var(--vp-font-family-mono, monospace); color: var(--vp-c-text-3); }
.hi__tab {
  padding: 4px 10px; border: 1px solid transparent; border-radius: 6px;
  background: transparent; cursor: pointer;
  font: 12px/1 var(--vp-font-family-mono, monospace); color: var(--vp-c-text-3);
}
.hi__tab:hover { color: var(--vp-c-text-1); }
.hi__tab.is-active {
  color: var(--vp-c-brand-1); background: var(--vp-c-bg-soft);
  border-color: var(--vp-c-divider);
}
.hi__code {
  flex: 1; min-height: 0; width: 100%; resize: none; border: 0; outline: 0;
  padding: 12px; background: var(--vp-c-bg);
  font: 12px/1.6 var(--vp-font-family-mono, monospace); color: var(--vp-c-text-1);
  white-space: pre; overflow: auto; tab-size: 2;
}
.hi__frame { flex: 1; min-height: 0; width: 100%; border: 0; background: #fff; }
</style>
