import { defineConfig } from 'vitepress'
import { fileURLToPath } from 'node:url'

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url))

export default defineConfig({
  title: 'Vyaz',
  description: 'Rich text layout engine — TypeScript, isomorphic, pixel-perfect typography',
  base: '/vyaz/',
  ignoreDeadLinks: true,

  head: [
    ['link', { rel: 'icon', href: '/vyaz/logo.png' }],
  ],

  themeConfig: {
    logo: '/logo.png',
    nav: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Browser usage', link: '/guide/browser' },
          { text: 'Tables', link: '/guide/tables' },
        ],
      },
      {
        text: 'Playground',
        items: [
          { text: 'Editor', link: '/playground' },
          { text: 'Cases', link: '/cases' },
        ],
      },
      {
        text: 'Converter',
        items: [
          { text: 'HTML', link: '/converter?format=html' },
          { text: 'Markdown', link: '/converter?format=markdown' },
        ],
      },
      { text: 'API', link: '/api/core' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Browser usage', link: '/guide/browser' },
          { text: 'Tables', link: '/guide/tables' },
          { text: 'Playground', link: '/playground' },
          { text: 'Converter', link: '/converter' },
          { text: 'Cases', link: '/cases' },
        ],
      },
      {
        text: 'API Reference',
        items: [
          { text: '@vyaz/core', link: '/api/core' },
          { text: '@vyaz/renderer', link: '/api/renderer' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/sedrew/vyaz' }],
  },

  vite: {
    resolve: {
      alias: {
        '@vyaz/core': r('../../packages/core/src'),
        '@vyaz/renderer': r('../../packages/renderers/src'),
        '@vyaz/converters': r('../../packages/converters/src'),
      },
    },
    optimizeDeps: {
      // @vyaz/* are aliased to TS source; the rest are Node-only and stubbed below
      exclude: ['@vyaz/core', '@vyaz/renderer', '@vyaz/converters', 'get-system-fonts', '@napi-rs/canvas'],
    },
    ssr: {
      // keep the playground + its heavy deps out of the SSR build
      noExternal: ['@tiptap/vue-3'],
    },
    plugins: [
      {
        // Vendored pretext (.js) imports sibling ".js" files that are actually
        // ".ts". Rewrite those to the real extension during the rollup build.
        name: 'vyaz-vendor-ts-ext',
        enforce: 'pre',
        async resolveId(source: string, importer: string | undefined) {
          if (!importer || !source.endsWith('.js') || !source.startsWith('.')) return null
          if (!importer.includes('/packages/core/src/')) return null
          const path = await import('node:path')
          const fs = await import('node:fs')
          const abs = path.resolve(path.dirname(importer), source)
          if (!fs.existsSync(abs) && fs.existsSync(abs.replace(/\.js$/, '.ts'))) {
            return abs.replace(/\.js$/, '.ts')
          }
          return null
        },
      },
      {
        // Replace Node-only modules that @vyaz/core references with browser stubs.
        name: 'vyaz-browser-stubs',
        enforce: 'pre',
        load(id: string) {
          if (id.includes('SystemFontRegistry') && !id.includes('stub')) {
            return `export class SystemFontRegistry { async scan(){return{total:0,registered:0}} isRegistered(){return false} getRegisteredFamilies(){return[]} }
export const systemFontRegistry = new SystemFontRegistry();`
          }
          if (id.includes('get-system-fonts')) return `export default async () => [];`
          if (id.includes('@napi-rs/canvas')) {
            return `export const createCanvas = () => ({ getContext: () => null });`
          }
          return null
        },
      },
    ],
  },
})
