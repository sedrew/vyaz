<template>
  <Teleport to="body">
    <button
      class="navpull"
      :class="{ 'is-collapsed': collapsed }"
      :style="{ '--navpull-left': leftPx + 'px' }"
      type="button"
      :title="collapsed ? 'Show sidebar  [' : 'Hide sidebar  ['"
      :aria-label="collapsed ? 'Show sidebar' : 'Hide sidebar'"
      :aria-pressed="collapsed"
      @click="toggle"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M13.5 7 8.5 12l5 5"
          fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"
        />
      </svg>
    </button>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const KEY = 'vyaz:nav-collapsed'
const collapsed = ref(false)
const leftPx = ref(258)

function apply(v: boolean) {
  document.documentElement.classList.toggle('vyaz-nav-collapsed', v)
}
/** dock the button to the sidebar's right edge (or the screen edge when hidden) */
function place() {
  if (collapsed.value) { leftPx.value = 4; return }
  const sb = document.querySelector('.VPSidebar')
  const right = sb ? sb.getBoundingClientRect().right : 272
  leftPx.value = Math.max(4, Math.round(right) - 15)
}
function toggle() {
  collapsed.value = !collapsed.value
  try { localStorage.setItem(KEY, collapsed.value ? '1' : '0') } catch {}
  apply(collapsed.value)
  place()
  // the sidebar animates for 250ms — re-measure once it settles
  window.setTimeout(place, 280)
}
function onKey(e: KeyboardEvent) {
  if (e.key !== '[' || e.metaKey || e.ctrlKey || e.altKey) return
  const t = e.target as HTMLElement | null
  if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return
  if (window.innerWidth < 960) return
  e.preventDefault()
  toggle()
}
onMounted(() => {
  try { collapsed.value = localStorage.getItem(KEY) === '1' } catch {}
  apply(collapsed.value)
  place()
  window.addEventListener('keydown', onKey)
  window.addEventListener('resize', place)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', place)
})
</script>

<style scoped>
.navpull { display: none; }

@media (min-width: 960px) {
  .navpull {
    position: fixed;
    top: 50%;
    left: var(--navpull-left, 258px);
    z-index: 45;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--vp-c-text-3);
    cursor: pointer;
    transform: translateY(-50%);
    transition:
      left 0.25s ease,
      background-color 0.15s ease,
      color 0.15s ease,
      box-shadow 0.15s ease;
  }
  .navpull:hover {
    background: var(--vp-c-bg);
    color: var(--vp-c-brand-1);
    box-shadow: 0 0 0 1px var(--vp-c-divider), 0 4px 12px -4px rgba(0, 0, 0, 0.18);
  }
  .navpull:focus-visible {
    outline: 2px solid var(--vp-c-brand-1);
    outline-offset: 2px;
  }
  .navpull svg { transition: transform 0.25s ease; }
  .navpull.is-collapsed svg { transform: rotate(180deg); }
}

@media (prefers-reduced-motion: reduce) {
  .navpull,
  .navpull svg { transition: none; }
}
</style>
