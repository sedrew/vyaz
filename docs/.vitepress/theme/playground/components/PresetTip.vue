<template>
  <Teleport to="body">
    <div ref="el" class="pt" :style="boxStyle" role="tooltip">
      <span class="pt__arrow" :style="{ left: arrowLeft + 'px' }" />
      <div class="pt__head">
        <span class="pt__name">{{ info.name }}</span>
        <span class="pt__struct">{{ info.struct }}</span>
      </div>
      <p class="pt__desc">{{ info.desc }}</p>
      <PresetSnippet :info="info" />
      <div class="pt__foot">
        <span class="pt__mlabel">baked&nbsp;in</span>
        <span class="pt__pips">
          <span
            v-for="n in 4" :key="n"
            class="pt__pip" :class="{ 'is-on': n <= info.baked }"
          />
        </span>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { PRESET_INFO, type PresetName } from '../lib/presetInfo'
import PresetSnippet from './PresetSnippet.vue'

const props = defineProps<{ preset: PresetName; anchor: DOMRect }>()

const info = computed(() => PRESET_INFO[props.preset])

const el = ref<HTMLElement | null>(null)
const w = ref(336)
const MARGIN = 10

const centre = computed(() => props.anchor.left + props.anchor.width / 2)
const left = computed(() => {
  const vw = window.innerWidth || 1024
  return Math.max(MARGIN, Math.min(centre.value - w.value / 2, vw - w.value - MARGIN))
})
const arrowLeft = computed(() =>
  Math.max(16, Math.min(centre.value - left.value, w.value - 16)),
)
const boxStyle = computed(() => ({
  top: `${props.anchor.bottom + 10}px`,
  left: `${left.value}px`,
}))

onMounted(() => {
  if (el.value) w.value = el.value.offsetWidth
})
</script>

<style scoped>
.pt {
  position: fixed;
  width: min(336px, calc(100vw - 20px));
  min-width: 240px;
  z-index: 60;
  padding: 14px 15px 13px;
  text-align: left;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  box-shadow: 0 12px 34px -10px rgba(0, 0, 0, 0.34);
  animation: pt-in 0.13s ease;
}
@keyframes pt-in {
  from { opacity: 0; transform: translateY(-4px); }
}
.pt__arrow {
  position: absolute;
  bottom: 100%;
  width: 11px;
  height: 11px;
  background: var(--vp-c-bg);
  border-left: 1px solid var(--vp-c-divider);
  border-top: 1px solid var(--vp-c-divider);
  transform: translate(-50%, 6px) rotate(45deg);
}
.pt__head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;
}
.pt__name {
  font: 700 13px/1 var(--vp-font-family-mono, monospace);
  color: var(--vp-c-brand-1);
}
.pt__struct {
  font: 400 10.5px/1 var(--vp-font-family-mono, monospace);
  color: var(--vp-c-text-3);
}
.pt__desc {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--vp-c-text-2);
}
.pt :deep(.ps__code) { font-size: 11px; padding: 10px 11px; }
.pt :deep(.ps__callout) { font-size: 10px; }
.pt__foot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 11px;
  padding-top: 10px;
  border-top: 1px solid var(--vp-c-divider);
}
.pt__mlabel {
  font: 500 10px/1.3 var(--vp-font-family-mono, monospace);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}
.pt__pips { display: flex; gap: 4px; }
.pt__pip { width: 20px; height: 5px; border-radius: 3px; background: var(--vp-c-divider); }
.pt__pip.is-on { background: var(--vp-c-brand-1); }

@media (prefers-reduced-motion: reduce) {
  .pt { animation: none; }
}
</style>
