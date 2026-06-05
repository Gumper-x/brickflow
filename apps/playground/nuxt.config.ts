import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  alias: {
    '#brickflow-http': fileURLToPath(new URL('../../packages/http/src', import.meta.url)),
  },
  brickflowUi: {
    componentPrefix: 'Brick',
    target: 'playground',
  },
  compatibilityDate: '2026-05-13',
  devtools: {
    enabled: true,
  },
  modules: ['../../packages/ui/src/module.ts'],
})
