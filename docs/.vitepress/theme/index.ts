import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { h } from 'vue'
import Playground from './playground/Playground.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, {}),
  enhanceApp({ app }) {
    // <Playground> is used from playground.md; it is client-only (Tiptap needs DOM).
    app.component('Playground', Playground)
  },
} satisfies Theme
