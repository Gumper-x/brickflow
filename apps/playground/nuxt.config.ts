export default defineNuxtConfig({
  brickflowHttp: {
    cacheTtlMs: 1000 * 60 * 10,
  },
  brickflowUi: {
    componentPrefix: 'Brick',
    target: 'playground',
  },
  compatibilityDate: '2026-05-13',
  devtools: {
    enabled: true,
  },
  modules: ['../../packages/ui/src/module.ts', '../../packages/http/src/module.ts'],
})
