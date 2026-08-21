import { createLintConfig } from '@brickflow/lint'

export default createLintConfig({
  includeVue: true,
  tailwindcssConfigPath: new URL('./src/runtime/ui.css', import.meta.url).pathname,
})
