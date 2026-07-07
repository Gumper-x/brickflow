export default defineNuxtConfig({
  brickflowUi: {
    componentPrefix: 'Brick',
    target: 'playground',
  },
  compatibilityDate: '2026-05-13',
  css: ['~/brickflow-ui.css'],
  devtools: {
    enabled: true,
  },
  modules: ['../../packages/ui/src/module.ts'],
})
