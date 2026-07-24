const CSS_FILE_PATTERN = /\.css(?:\?.*)?$/
const CUSTOM_DARK_VARIANT = "@custom-variant dark (&:where([data-ui-theme='dark'], [data-ui-theme='dark'] *));"
const TAILWIND_IMPORT_PATTERN = /@import\s+(['"])tailwindcss\1\s*;/u

interface PluginContext {}

interface VitePlugin {
  enforce: 'pre'
  name: string
  transform: (this: PluginContext, code: string, id: string) => null | { code: string; map: null }
}

/**
 * Makes Tailwind's `dark:` variant follow the theme selected by `useTheme`.
 *
 * The directive needs to be part of the stylesheet that imports Tailwind, so
 * it is injected before Tailwind processes the consumer's CSS.
 */
export const brickflowUiTailwindVariantPlugin = (): VitePlugin => ({
  enforce: 'pre',
  name: 'brickflow-ui-tailwind-variant',
  transform(code, id) {
    if (!CSS_FILE_PATTERN.test(id) || code.includes('@custom-variant dark')) {
      return null
    }

    const importMatch = code.match(TAILWIND_IMPORT_PATTERN)

    if (!importMatch) {
      return null
    }

    const index = (importMatch.index ?? 0) + importMatch[0].length

    return {
      code: `${code.slice(0, index)}\n${CUSTOM_DARK_VARIANT}${code.slice(index)}`,
      map: null,
    }
  },
})
