import { createLintConfig } from '@brickflow/lint'

export default createLintConfig({
  includeVue: true,
  tailwindcssConfigPath: new URL('ui.css', import.meta.url).pathname,
})
