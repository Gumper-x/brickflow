export default defineNuxtPlugin((nuxtApp) => {
  provideBrickflowConfig(nuxtApp.vueApp, {
    i18n: useI18n(),
  })
})
