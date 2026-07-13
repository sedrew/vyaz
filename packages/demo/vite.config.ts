import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [
    vue(),
    // Browser stubs — replace Node-only modules with browser-safe versions
    {
      name: 'browser-stubs',
      load(id) {
        // canvas-polyfill — has `import { createRequire } from 'module'` which breaks in browser
        if (id.includes('canvas-polyfill') && !id.includes('stubs')) {
          return `
export function registerCanvasFont() {}
export function enableOfficeTextMeasure() {}
export function disableOfficeTextMeasure() {}
`
        }
        // SystemFontRegistry — has `import { readFileSync } from 'node:fs'`
        if (id.includes('SystemFontRegistry') && !id.includes('stubs')) {
          return `
export class SystemFontRegistry {
  async scan() { return { total: 0, registered: 0 }; }
  isRegistered() { return false; }
  getRegisteredFamilies() { return []; }
}
export const systemFontRegistry = new SystemFontRegistry();
`
        }
        // fontkit — not needed in browser
        if (id.includes('fontkit') && !id.includes('stubs')) {
          return `export default {}; export const create = () => ({});`
        }
        // @napi-rs/canvas — native addon
        if (id.includes('@napi-rs/canvas')) {
          return `export const createCanvas = () => ({ getContext: () => null, toBuffer: () => Buffer.from([]) });`
        }
        // get-system-fonts — Node-only
        if (id.includes('get-system-fonts') && !id.includes('stubs')) {
          return `export default async () => [];`
        }
        return null
      },
    },
  ],
  resolve: {
    alias: {
      '@vyaz/core': path.resolve(__dirname, '../core/src'),
      '@vyaz/renderer': path.resolve(__dirname, '../renderer/src'),
    },
  },
  optimizeDeps: {
    exclude: [
      '@vyaz/core',
      '@vyaz/renderer',
      'fontkit',
      'get-system-fonts',
      '@napi-rs/canvas',
      '@chenglou/pretext',
      'js-yaml',
    ],
  },
})