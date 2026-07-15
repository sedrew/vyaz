import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Vyaz',
  description: 'Rich text layout engine — TypeScript, isomorphic, pixel-perfect typography',
  base: '/vyaz/',
  ignoreDeadLinks: true,
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/core' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
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
    socialLinks: [
      { icon: 'github', link: 'https://github.com/sedrew/vyaz' },
    ],
  },
})