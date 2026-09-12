export default defineNuxtConfig({
  brickflowUi: {
    componentPrefix: 'Brick',
    iconsPath: './icons',
  },
  compatibilityDate: '2026-05-13',
  css: ['~/ui.css'],
  devtools: {
    enabled: true,
  },
  modules: ['../../packages/ui/src/module.ts'],
  vite: {
    build: {
      target: 'es2020',
    },
    css: {
      modules: {
        localsConvention: 'camelCaseOnly',
      },
      postcss: {},
    },
  },
})
