export default defineNuxtPlugin((nuxtApp) => {
  provideBrickflow(nuxtApp.vueApp, {
    i18n: useI18n(),
  })
})
