import { defineConfig } from 'rolldown'

export default defineConfig({
  external: ['#app', 'vue'],
  input: {
    index: './src/index.ts',
    nuxt: './src/nuxt.ts',
  },
  output: {
    dir: 'dist',
    entryFileNames: '[name].mjs',
    format: 'es',
    sourcemap: true,
  },
})
