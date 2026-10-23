export default defineNuxtPlugin((nuxtApp) => {
  const i18n = useI18n()
  provideBrickflow(nuxtApp.vueApp, {
    i18n,
    rules: {
      email: () => i18n.t('Enter a valid email'),
      length: ({ length }) => i18n.t(`Must be exactly ${length} characters`),
      maxLength: ({ max }) => i18n.t(`Maximum ${max} characters`),
      minLength: ({ min }) => i18n.t(`Minimum ${min} characters`),
      required: () => i18n.t('Required field'),
      url: () => i18n.t('Enter a valid URL'),
    },
  })
})
