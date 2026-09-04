import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { h } from 'vue'
import Playground from './playground/Playground.vue'
import CaseExplorer from './playground/components/CaseExplorer.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, {}),
  enhanceApp({ app }) {
    // Both are client-only (Tiptap / import.meta.glob need the browser); used
    // from playground.md and cases.md via <ClientOnly>.
    app.component('Playground', Playground)
    app.component('CaseExplorer', CaseExplorer)
  },
} satisfies Theme
