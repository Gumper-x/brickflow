export default defineNuxtConfig({
  brickflowUi: {
    componentPrefix: 'Brick',
  },
  compatibilityDate: '2026-05-13',
  css: ['~/ui.css'],
  devtools: {
    enabled: true,
  },
  modules: ['../../packages/ui/src/module.ts'],
})
