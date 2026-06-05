declare module '#app' {
  export * from 'nuxt/app'
}

interface ImportMeta {
  browser: boolean
  client: boolean
  dev: boolean
  server: boolean
  test: boolean
}
