<template>
  <div class="td" ref="rootEl">
    <button
      type="button"
      class="td__trigger"
      :class="{ 'is-open': open }"
      :title="ariaLabel"
      :aria-label="ariaLabel"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="open = !open"
    >
      <slot name="trigger" :option="selected">{{ selected?.label ?? modelValue }}</slot>
      <IconChevronDown :size="13" :stroke="2" class="td__chevron" />
    </button>
    <ul v-if="open" class="td__menu" role="listbox">
      <li
        v-for="opt in options"
        :key="opt.value"
        role="option"
        :aria-selected="opt.value === modelValue"
        class="td__item"
        :class="{ 'is-selected': opt.value === modelValue }"
        @click="select(opt.value)"
      >
        <slot name="option" :option="opt">{{ opt.label }}</slot>
        <IconCheck v-if="opt.value === modelValue" :size="14" :stroke="2" class="td__check" />
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import { IconChevronDown, IconCheck } from '@tabler/icons-vue'

export interface ToolbarDropdownOption {
  value: string
  label: string
  [key: string]: unknown
}

const props = defineProps<{
  modelValue: string
  options: ToolbarDropdownOption[]
  ariaLabel?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)
const selected = computed(() => props.options.find(o => o.value === props.modelValue))

function select(value: string) {
  emit('update:modelValue', value)
  open.value = false
}
function onDocClick(e: MouseEvent) {
  if (open.value && rootEl.value && !rootEl.value.contains(e.target as Node)) open.value = false
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') open.value = false
}

document.addEventListener('click', onDocClick)
document.addEventListener('keydown', onKeydown)
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.td {
  position: relative;
  display: inline-flex;
}

.td__trigger {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 7px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  transition: border-color 0.12s ease, background 0.12s ease, box-shadow 0.12s ease;
}

.td__trigger:hover {
  border-color: var(--vp-c-text-3);
  background: var(--vp-c-bg-soft);
}

.td__trigger.is-open {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--vp-c-brand-1) 20%, transparent);
}

.td__chevron {
  opacity: 0.55;
  transition: transform 0.12s ease, opacity 0.12s ease;
}

.td__trigger.is-open .td__chevron {
  transform: rotate(180deg);
  opacity: 0.9;
}

.td__menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 30;
  min-width: 150px;
  margin: 0;
  padding: 4px;
  list-style: none;
  background: var(--vp-c-bg-elv, var(--vp-c-bg));
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14), 0 2px 6px rgba(0, 0, 0, 0.08);
}

.td__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 12.5px;
  color: var(--vp-c-text-1);
  cursor: pointer;
  white-space: nowrap;
}

.td__item:hover {
  background: var(--vp-c-bg-soft);
}

.td__item.is-selected {
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.td__check {
  color: var(--vp-c-brand-1);
  flex-shrink: 0;
}
</style>
