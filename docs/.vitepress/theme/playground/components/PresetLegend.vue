<template>
  <div class="pl">
    <div
      v-for="name in PRESET_ORDER" :key="name"
      class="pl__row" :id="'preset-' + name"
    >
      <div class="pl__l">
        <div class="pl__head">
          <span class="pl__name">{{ PRESET_INFO[name].name }}</span>
          <span class="pl__struct">{{ PRESET_INFO[name].struct }}</span>
        </div>
        <p class="pl__desc">{{ PRESET_INFO[name].desc }}</p>
        <div class="pl__meter" :title="PRESET_INFO[name].baked + ' / 4 — layout baked into the markup'">
          <span class="pl__mlabel">baked&nbsp;in</span>
          <span class="pl__pips">
            <span
              v-for="n in 4" :key="n"
              class="pl__pip" :class="{ 'is-on': n <= PRESET_INFO[name].baked }"
            />
          </span>
        </div>
      </div>
      <div class="pl__r">
        <PresetSnippet :info="PRESET_INFO[name]" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PRESET_ORDER, PRESET_INFO } from '../lib/presetInfo'
import PresetSnippet from './PresetSnippet.vue'
</script>

<style scoped>
.pl {
  margin: 22px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  background: var(--vp-c-bg);
}
.pl__row {
  display: grid;
  grid-template-columns: minmax(0, 0.72fr) minmax(0, 1.28fr);
  gap: 24px;
  padding: 18px 20px;
  border-top: 1px solid var(--vp-c-divider);
  scroll-margin-top: 96px;
}
.pl__row:first-child { border-top: 0; }

.pl__head {
  display: flex;
  align-items: baseline;
  gap: 9px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.pl__name {
  font: 700 13px/1 var(--vp-font-family-mono, monospace);
  color: var(--vp-c-brand-1);
}
.pl__struct {
  font: 400 10.5px/1 var(--vp-font-family-mono, monospace);
  color: var(--vp-c-text-3);
}
.pl__desc {
  margin: 0 0 12px;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--vp-c-text-2);
}
.pl__meter { display: flex; align-items: center; gap: 8px; }
.pl__mlabel {
  font: 500 10px/1.3 var(--vp-font-family-mono, monospace);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--vp-c-text-3);
}
.pl__pips { display: flex; gap: 4px; }
.pl__pip {
  width: 20px;
  height: 5px;
  border-radius: 3px;
  background: var(--vp-c-divider);
}
.pl__pip.is-on { background: var(--vp-c-brand-1); }

.pl__r { align-self: start; }

@media (max-width: 640px) {
  .pl__row { grid-template-columns: 1fr; gap: 12px; }
}
</style>
