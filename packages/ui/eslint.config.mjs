import { createLintConfig } from '@brickflow/lint'

export default createLintConfig({
  includeVue: true,
  tailwindcssConfigPath: new URL('./src/ui.css', import.meta.url).pathname,
})
