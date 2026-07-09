import {
  addComponentsDir,
  addImportsDir,
  addTemplate,
  createResolver,
  defineNuxtModule,
  resolvePath,
} from '@nuxt/kit'
import tailwindcss from '@tailwindcss/vite'
import { createJiti } from 'jiti'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'

import { type BrickflowUiConfig, defineBrickflowUiConfig } from './runtime/tailwind'
import {
  brickflowUiStylePlugin,
  collectUiStyleConfigPathsFromCode,
  collectUiStylePathsFromCode,
  createUiStyleTypeDeclaration,
} from './vite/ui-style'

export interface ModuleOptions {
  componentPrefix?: string
  configPath?: string
}

interface BrickflowRuntimeConfig {
  message?: string
}

const UI_STYLE_FILE_PATTERN = /\.(?:[cm]?[jt]sx?|vue)$/

const scanUiStyleFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => [])
  const files: string[] = []

  for (const entry of entries) {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await scanUiStyleFiles(path)))
      continue
    }

    if (UI_STYLE_FILE_PATTERN.test(entry.name)) {
      files.push(path)
    }
  }

  return files
}

export default defineNuxtModule<ModuleOptions>({
  defaults: {
    componentPrefix: 'Brick',
    configPath: '~/ui.config.ts',
  },
  meta: {
    compatibility: {
      nuxt: '>=4.0.0',
    },
    configKey: 'brickflowUi',
    name: '@brickflow/ui',
  },
  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const currentConfig = (nuxt.options.runtimeConfig.public.brickflowUi ?? {}) as BrickflowRuntimeConfig
    const defaultConfigPath = resolver.resolve('./runtime/tailwind')
    const runtimePath = resolver.resolve('./runtime')
    const resolvedConfigPath = await resolvePath(options.configPath ?? defaultConfigPath).catch(
      () => defaultConfigPath,
    )
    const loadConfig = createJiti(import.meta.url, {
      interopDefault: true,
      moduleCache: false,
    })

    const loadUiConfig = async (): Promise<BrickflowUiConfig> => {
      const validateConfig = defineBrickflowUiConfig as (config: Partial<BrickflowUiConfig>) => BrickflowUiConfig

      return validateConfig(
        (await loadConfig.import(resolvedConfigPath).catch(() => ({}))) as Partial<BrickflowUiConfig>,
      )
    }

    const _uiConfig = await loadUiConfig()
    const uiStyleTypePath = resolve(nuxt.options.buildDir, 'types/brickflow-ui-style.d.ts')
    const generateUiStyleTypes = async (): Promise<void> => {
      const files = await scanUiStyleFiles(runtimePath)
      const fileContents = await Promise.all(
        files.map(async (file) => ({
          content: await readFile(file, 'utf8'),
          file,
        })),
      )
      const paths = fileContents.flatMap(({ content }) => collectUiStylePathsFromCode(content))
      const configPaths = fileContents.flatMap(({ content, file }) =>
        collectUiStyleConfigPathsFromCode(content, file),
      )

      await mkdir(resolve(nuxt.options.buildDir, 'types'), { recursive: true })
      await writeFile(
        uiStyleTypePath,
        createUiStyleTypeDeclaration({
          configPaths,
          paths,
        }),
      )
    }

    const uiConfigTemplate = addTemplate({
      filename: 'brickflow/brickflow-ui-config.mjs',
      getContents: () =>
        [
          `import rawConfig from ${JSON.stringify(resolvedConfigPath.replaceAll('\\', '/'))}`,
          `import { defineBrickflowUiConfig } from ${JSON.stringify(resolver.resolve('./runtime/tailwind').replaceAll('\\', '/'))}`,
          '',
          'const config = defineBrickflowUiConfig(rawConfig)',
          '',
          'export const UI_STYLE = config.uiStyles',
          'export const uiStyles = config.uiStyles',
          'export default config',
          '',
        ].join('\n'),
    })

    nuxt.options.runtimeConfig.public.brickflowUi = {
      ...currentConfig,
      message: currentConfig.message ?? 'Hello world',
    }

    nuxt.options.alias['#brickflow-ui-config'] = uiConfigTemplate.dst

    await generateUiStyleTypes()

    nuxt.hook('prepare:types', async ({ references }) => {
      await generateUiStyleTypes()
      references.push({ path: uiStyleTypePath })
    })

    nuxt.hook('builder:watch', async (_event, path) => {
      const absolutePath = resolve(nuxt.options.srcDir, path)

      if (relative(runtimePath, absolutePath).startsWith('..') || !UI_STYLE_FILE_PATTERN.test(path)) {
        return
      }

      await generateUiStyleTypes()
    })

    nuxt.hook('vite:extendConfig', (config) => {
      const viteConfig = config as { plugins?: unknown[] }
      viteConfig.plugins ??= []
      viteConfig.plugins.push(
        brickflowUiStylePlugin({
          configPath: resolvedConfigPath,
          getStyles: async () => (await loadUiConfig()).uiStyles,
        }) as unknown,
      )
      viteConfig.plugins.push(tailwindcss() as unknown)
    })

    addImportsDir(resolver.resolve('./runtime/composables'))
    addComponentsDir({
      path: resolver.resolve('./runtime/components'),
      pathPrefix: false,
      prefix: options.componentPrefix ?? 'Brick',
    })
  },
})
