import {
  addComponentsDir,
  addImportsDir,
  addTemplate,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  resolvePath,
  updateTemplates,
} from '@nuxt/kit'
import tailwindcss from '@tailwindcss/vite'
import { createJiti } from 'jiti'
import { readdir, readFile } from 'node:fs/promises'
import { basename, dirname, join, relative, resolve } from 'node:path'

import { type BrickflowUiConfig, defineBrickflowUi } from './runtime/tailwind'
import {
  brickflowUiIconFontPlugin,
  createIconFontAssetsInlineLimit,
  getIconFontCssPath,
  getIconFontNames,
  type ViteAssetsInlineLimit,
} from './vite/icon-font'
import { brickflowUiTailwindVariantPlugin } from './vite/tailwind-variant'
import {
  brickflowUiStylePlugin,
  collectUiConfigComponentPathsFromCode,
  collectUiConfigPathsFromCode,
  collectUiConfigSchemaEntriesFromCode,
  collectUiConfigStyleReferencePaths,
  collectUiStyleConfigPathsFromCode,
  collectUiStylePathsFromCode,
  createUiConfigLiteralTypeDeclaration,
  createUiConfigSchemaTypeDeclaration,
  createUiStyleTypeDeclaration,
} from './vite/ui-style'

export interface ModuleOptions {
  componentPrefix?: string
  configPath?: string
  iconsPath?: string
  theme?: boolean
}

export type {
  BrickflowConfig,
  BrickflowI18n,
  BrickflowRouteLocationParam,
} from './runtime/composables/useTranslate'

const UI_STYLE_FILE_PATTERN = /\.(?:[cm]?[jt]sx?|vue)$/
const UI_COMPONENT_FILE_PATTERN = /(?:^|[/\\])index\.vue$/
const UI_DEMO_FILE_PATTERN = /\.demo\.vue$/
const THEME_BOOTSTRAP_SCRIPT = `;(() => {
  let storedTheme

  try {
    storedTheme = localStorage.getItem('ui-theme')
  } catch {}

  const theme =
    storedTheme === 'dark' || storedTheme === 'light'
      ? storedTheme
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
  const root = document.documentElement

  root.dataset.uiTheme = theme
  root.style.colorScheme = theme
})()`

const toKebabCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\\/]/g, '-')
    .toLowerCase()

const getComponentName = (path: string): string => path.replace(/[/\\]index\.vue$/, '').replaceAll('/', ' / ')

interface NuxtOptionsWithRouteRules {
  routeRules?: Record<string, UiRouteRule>
}

interface UiComponentProp {
  name: string
  required: boolean
  type: string
}

interface UiRouteRule {
  headers?: Record<string, string>
  ssr?: boolean
}

interface UiStyleValue {
  path: string
  value?: string
}

interface ViteConfig {
  build?: {
    assetsInlineLimit?: ViteAssetsInlineLimit
  }
  plugins?: unknown[]
}

const readObjectPath = (source: unknown, path: string[]): unknown =>
  path.reduce<unknown>((value, key) => {
    if (!value || typeof value !== 'object') {
      return undefined
    }

    return (value as Record<string, unknown>)[key]
  }, source)

const getBracedContent = (source: string, fromIndex: number): string | undefined => {
  const openingIndex = source.indexOf('{', fromIndex)
  if (openingIndex === -1) {
    return undefined
  }

  let depth = 0

  for (let index = openingIndex; index < source.length; index += 1) {
    const character = source[index]
    if (character === '{') {
      depth += 1
    } else if (character === '}') {
      depth -= 1
    }

    if (depth === 0) {
      return source.slice(openingIndex + 1, index)
    }
  }

  return undefined
}

const getPropsSource = (source: string): string | undefined => {
  const interfaceIndex = source.indexOf('interface Props')
  if (interfaceIndex !== -1) {
    return getBracedContent(source, interfaceIndex)
  }

  const definePropsIndex = source.indexOf('defineProps<')

  return definePropsIndex === -1 ? undefined : getBracedContent(source, definePropsIndex)
}

const collectComponentProps = (source: string): UiComponentProp[] => {
  const propsSource = getPropsSource(source)
  if (!propsSource) {
    return []
  }

  return propsSource.split('\n').flatMap((sourceLine) => {
    const line = sourceLine.trim().replace(/[;,]$/, '')
    const separatorIndex = line.indexOf(':')
    const name = line.slice(0, separatorIndex)
    const type = line.slice(separatorIndex + 1).trim()

    if (separatorIndex === -1 || !/^[a-z_$][\w$]*\??$/i.test(name) || !type) {
      return []
    }

    return [
      {
        name: name.replace(/\?$/, ''),
        required: !name.endsWith('?'),
        type,
      },
    ]
  })
}

const collectComponentSlots = (source: string): string[] => {
  const conditionalSlots = [...source.matchAll(/\$slots\.([A-Za-z_$][\w$]*)/g)]
    .map((match) => match[1])
    .filter((slot): slot is string => Boolean(slot))
  const renderedSlots = [...source.matchAll(/<slot\b[^>]*>/g)].map((match) => {
    const name = match[0].match(/\bname=["']([^"']+)["']/)?.[1]

    return name ?? 'default'
  })

  return [...new Set([...conditionalSlots, ...renderedSlots])].sort()
}

const toComponentStyleKey = (path: string): string => {
  const componentName = basename(dirname(path))

  return `${componentName[0]?.toLowerCase()}${componentName.slice(1)}`
}

const collectComponentStyleValues = (
  source: string,
  componentPath: string,
  config: BrickflowUiConfig,
): UiStyleValue[] =>
  [
    ...collectUiStylePathsFromCode(source),
    ...collectUiConfigStyleReferencePaths(config.uiConfig)
      .filter(([component]) => component === toComponentStyleKey(componentPath))
      .map((path) => path.slice(1)),
  ]
    .map((path) => path.join('.'))
    .filter(Boolean)
    .filter((path, index, paths) => paths.indexOf(path) === index)
    .sort()
    .map((path) => {
      const segments = path.split('.')
      const componentValue = readObjectPath(config.uiStyles, [toComponentStyleKey(componentPath), ...segments])
      const globalValue = readObjectPath(config.uiStyles, segments)

      let value: string | undefined
      if (typeof componentValue === 'string') {
        value = componentValue
      } else if (typeof globalValue === 'string') {
        value = globalValue
      }

      return { path, value }
    })

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
    iconsPath: undefined,
    theme: false,
  },
  meta: {
    compatibility: {
      nuxt: '>=4.0.0',
    },
    configKey: 'brickflowUi',
    name: '@brickflow/ui',
  },
  async setup(options, nuxt) {
    const nuxtOptions = nuxt.options as unknown as NuxtOptionsWithRouteRules

    nuxtOptions.routeRules ??= {}
    const uiRouteRule = nuxtOptions.routeRules['/ui'] ?? {}

    nuxtOptions.routeRules['/ui'] = {
      ...uiRouteRule,
      headers: {
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
        ...uiRouteRule.headers,
      },
      ssr: uiRouteRule.ssr ?? false,
    }

    const resolver = createResolver(import.meta.url)
    const defaultConfigPath = resolver.resolve('./runtime/tailwind')
    const runtimePath = resolver.resolve('./runtime')
    const componentsDirectory = resolve(runtimePath, 'components')
    const resolvedConfigPath = await resolvePath(options.configPath ?? defaultConfigPath).catch(
      () => defaultConfigPath,
    )

    if (options.theme) {
      nuxt.options.app.head.script ??= []
      nuxt.options.app.head.script.unshift({
        innerHTML: THEME_BOOTSTRAP_SCRIPT,
        key: 'ui-theme',
      })
    }

    const iconFont = options.iconsPath
      ? {
          inputDir: await resolvePath(options.iconsPath).catch(() => resolve(options.iconsPath as string)),
          outputDir: resolve(nuxt.options.buildDir, 'brickflow/icons'),
        }
      : undefined

    if (iconFont) {
      nuxt.options.css.push(getIconFontCssPath(iconFont.outputDir))
    }

    const loadConfig = createJiti(import.meta.url, {
      interopDefault: true,
      moduleCache: false,
    })

    const toPascalCase = (value: string): string =>
      value
        .split(/[/\\._-]+/)
        .filter(Boolean)
        .map((segment) => `${segment[0]?.toUpperCase()}${segment.slice(1)}`)
        .join('')

    const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    const getUiComponentNameFromImport = (
      specifier: string,
      demoPath: string,
      componentsRoot: string,
    ): string | undefined => {
      if (!specifier.startsWith('.')) {
        return undefined
      }

      const componentPath = resolve(dirname(demoPath), specifier)
      if (
        relative(componentsRoot, componentPath).startsWith('..') ||
        !UI_COMPONENT_FILE_PATTERN.test(componentPath)
      ) {
        return undefined
      }

      return toPascalCase(relative(componentsRoot, componentPath).replace(/[/\\]index\.vue$/, ''))
    }

    const createDemoCode = (
      source: string,
      demoPath: string,
      componentsRoot: string,
      componentPrefix: string,
    ): string => {
      const importedComponents = new Map<string, string>()
      const removeScriptBlocks = (
        code: string,
        shouldRemove: (openingTag: string, content: string) => boolean,
      ): string => {
        const openingTagPrefix = '<script'
        const closingTag = '</script>'
        let result = ''
        let cursor = 0
        let scriptStart = code.indexOf(openingTagPrefix, cursor)

        while (scriptStart !== -1) {
          const nextCharacter = code[scriptStart + openingTagPrefix.length]
          if (nextCharacter && !/[\s>]/.test(nextCharacter)) {
            scriptStart = code.indexOf(openingTagPrefix, scriptStart + openingTagPrefix.length)
            continue
          }

          const openingEnd = code.indexOf('>', scriptStart)
          const closingStart = openingEnd === -1 ? -1 : code.indexOf(closingTag, openingEnd)
          if (openingEnd === -1 || closingStart === -1) {
            break
          }

          const openingTag = code.slice(scriptStart, openingEnd + 1)
          const content = code.slice(openingEnd + 1, closingStart)
          result += code.slice(cursor, scriptStart)

          if (!shouldRemove(openingTag, content)) {
            result += code.slice(scriptStart, closingStart + closingTag.length)
          }

          cursor = closingStart + closingTag.length
          scriptStart = code.indexOf(openingTagPrefix, cursor)
        }

        return result + code.slice(cursor)
      }
      const isSetupScript = (openingTag: string): boolean => /\bsetup(?:\s|>)/.test(openingTag)
      const codeWithoutMeta = removeScriptBlocks(source, (openingTag) => !isSetupScript(openingTag))
      const codeWithoutImports = codeWithoutMeta.replace(
        /^\s*import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)['"];?\s*$/gm,
        (statement, localName: string, specifier: string) => {
          const componentName = getUiComponentNameFromImport(specifier, demoPath, componentsRoot)
          if (!componentName) {
            return statement
          }

          importedComponents.set(localName, `${componentPrefix}${componentName}`)

          return ''
        },
      )

      const codeWithPrefixedComponents = [...importedComponents.entries()].reduce(
        (code, [localName, componentName]) =>
          code.replace(new RegExp(`<(/?)${escapeRegExp(localName)}(?=[\\s>/])`, 'g'), `<$1${componentName}`),
        codeWithoutImports,
      )

      return removeScriptBlocks(
        codeWithPrefixedComponents,
        (openingTag, content) => isSetupScript(openingTag) && !content.trim(),
      )
    }

    const loadUiConfig = async (): Promise<BrickflowUiConfig> => {
      const validateConfig = defineBrickflowUi as (config: Partial<BrickflowUiConfig>) => BrickflowUiConfig

      return validateConfig(
        (await loadConfig.import(resolvedConfigPath).catch(() => ({}))) as Partial<BrickflowUiConfig>,
      )
    }

    const _uiConfig = await loadUiConfig()
    const getUiStyleTypeContents = async (): Promise<string> => {
      const files = await scanUiStyleFiles(runtimePath)
      const fileContents = await Promise.all(
        files.map(async (file) => ({
          content: await readFile(file, 'utf8'),
          file,
        })),
      )
      const uiConfig = (await loadUiConfig()).uiConfig
      const uiConfigStyleReferencePaths = collectUiConfigStyleReferencePaths(uiConfig)
      const paths = [
        ...fileContents.flatMap(({ content }) => collectUiStylePathsFromCode(content)),
        ...uiConfigStyleReferencePaths.map((path) => path.slice(1)),
      ]
      const configPaths = fileContents.flatMap(({ content, file }) =>
        collectUiStyleConfigPathsFromCode(content, file),
      )
      configPaths.push(...uiConfigStyleReferencePaths)
      const uiConfigPaths = fileContents.flatMap(({ content, file }) =>
        collectUiConfigPathsFromCode(content, file, uiConfig),
      )
      return createUiStyleTypeDeclaration({
        configPaths,
        paths,
        uiConfigPaths,
      })
    }

    const uiStyleTypeTemplate = addTypeTemplate({
      filename: 'types/brickflow-ui-style.d.ts',
      getContents: getUiStyleTypeContents,
    })
    const uiConfigLiteralTypeTemplate = addTypeTemplate({
      filename: 'types/brickflow-ui-config-literals.d.ts',
      getContents: async () => {
        const files = await scanUiStyleFiles(runtimePath)
        const uiConfig = (await loadUiConfig()).uiConfig
        const paths = await Promise.all(
          files.map(async (file) =>
            collectUiConfigComponentPathsFromCode(await readFile(file, 'utf8'), file, uiConfig),
          ),
        )
        return createUiConfigLiteralTypeDeclaration(paths.flat(), uiConfig)
      },
    })
    const uiConfigSchemaTypeTemplate = addTypeTemplate({
      filename: 'types/brickflow-ui-config-contract.d.ts',
      getContents: async () => {
        const files = await scanUiStyleFiles(componentsDirectory)
        const entries = await Promise.all(
          files.map(async (file) => collectUiConfigSchemaEntriesFromCode(await readFile(file, 'utf8'), file)),
        )

        return createUiConfigSchemaTypeDeclaration(entries.flat())
      },
    })
    nuxt.hook('prepare:types', ({ references }) => {
      references.push({ path: resolver.resolve('./runtime/config.d.ts') })
    })

    const iconFontTemplate = addTemplate({
      filename: 'brickflow/brickflow-ui-icons.mjs',
      getContents: async () => {
        const iconNames = iconFont ? await getIconFontNames(iconFont.inputDir) : []

        return [
          `export const iconNames = ${JSON.stringify(iconNames)}`,
          `export const firstIconName = ${JSON.stringify(iconNames[0] ?? '')}`,
          '',
        ].join('\n')
      },
    })

    const uiConfigTemplate = addTemplate({
      filename: 'brickflow/brickflow-ui-config.mjs',
      getContents: () =>
        [
          `import { defineBrickflowUi } from ${JSON.stringify(resolver.resolve('./runtime/tailwind').replaceAll('\\', '/'))}`,
          `import rawConfig from ${JSON.stringify(resolvedConfigPath.replaceAll('\\', '/'))}`,
          '',
          'const config = defineBrickflowUi(rawConfig)',
          '',
          'export const UI_STYLE = config.uiStyles',
          'export const UI_CONFIG = config.uiConfig',
          'export const uiConfig = config.uiConfig',
          'export const uiStyles = config.uiStyles',
          'export default config',
          '',
        ].join('\n'),
    })

    const uiOptionsTemplate = addTemplate({
      filename: 'brickflow/brickflow-ui-options.mjs',
      getContents: () => `export const uiThemeEnabled = ${JSON.stringify(options.theme === true)}\n`,
    })

    const uiCatalogTemplate = addTemplate({
      filename: 'brickflow/ui-catalog.ts',
      getContents: async () => {
        const files = await scanUiStyleFiles(componentsDirectory)
        const config = await loadUiConfig()
        const components = await Promise.all(
          files
            .filter((path) => UI_COMPONENT_FILE_PATTERN.test(path))
            .sort()
            .map(async (path) => {
              const source = await readFile(path, 'utf8')
              const relativePath = relative(componentsDirectory, path).replaceAll('\\', '/')
              const demos = await Promise.all(
                files
                  .filter((file) => dirname(file) === dirname(path) && UI_DEMO_FILE_PATTERN.test(file))
                  .sort()
                  .map(async (demoPath) => ({
                    code: createDemoCode(
                      await readFile(demoPath, 'utf8'),
                      demoPath,
                      componentsDirectory,
                      options.componentPrefix ?? 'Brick',
                    ),
                    id: toKebabCase(basename(demoPath).replace(UI_DEMO_FILE_PATTERN, '')),
                    path: demoPath,
                  })),
              )

              return {
                demos,
                id: toKebabCase(relativePath.replace(/[/\\]index\.vue$/, '')),
                name: getComponentName(relativePath),
                path,
                props: collectComponentProps(source),
                slots: collectComponentSlots(source),
                styles: collectComponentStyleValues(source, path, config),
              }
            }),
        )

        return [
          "import type { Component } from 'vue'",
          ...components.map(
            (component, index) =>
              `import Component${index} from ${JSON.stringify(component.path.replaceAll('\\', '/'))}`,
          ),
          ...components.flatMap((component, componentIndex) =>
            component.demos.map(
              (demo, demoIndex) =>
                `import Demo${componentIndex}_${demoIndex}, { uiDemo as uiDemo${componentIndex}_${demoIndex} } from ${JSON.stringify(demo.path.replaceAll('\\', '/'))}`,
            ),
          ),
          '',
          'export interface BrickflowUiDemo {',
          '  code: string',
          '  component: Component',
          '  description?: string',
          '  id: string',
          '  title: string',
          '}',
          '',
          'export interface BrickflowUiDemoMeta {',
          '  description?: string',
          '  title?: string',
          '}',
          '',
          'export interface BrickflowUiProp {',
          '  name: string',
          '  required: boolean',
          '  type: string',
          '}',
          '',
          'export interface BrickflowUiStyleValue {',
          '  path: string',
          '  value?: string',
          '}',
          '',
          'export interface BrickflowUiComponent {',
          '  component: Component',
          '  demos: BrickflowUiDemo[]',
          '  id: string',
          '  name: string',
          '  props: BrickflowUiProp[]',
          '  slots: string[]',
          '  styles: BrickflowUiStyleValue[]',
          '}',
          '',
          'export const uiComponents = [',
          ...components.map(
            (component, componentIndex) =>
              `  { component: Component${componentIndex}, demos: [${component.demos
                .map(
                  (demo, demoIndex) =>
                    `{ code: ${JSON.stringify(demo.code)}, component: Demo${componentIndex}_${demoIndex}, description: uiDemo${componentIndex}_${demoIndex}.description, id: ${JSON.stringify(demo.id)}, title: uiDemo${componentIndex}_${demoIndex}.title ?? 'Demo' }`,
                )
                .join(
                  ', ',
                )}], id: ${JSON.stringify(component.id)}, name: ${JSON.stringify(component.name)}, props: ${JSON.stringify(component.props)}, slots: ${JSON.stringify(component.slots)}, styles: ${JSON.stringify(component.styles)} },`,
          ),
          '] satisfies BrickflowUiComponent[]',
          '',
        ].join('\n')
      },
    })

    nuxt.options.alias['#brickflow-ui-config'] = uiConfigTemplate.dst
    nuxt.options.alias['#brickflow-ui-catalog'] = uiCatalogTemplate.dst
    nuxt.options.alias['#brickflow-ui-icons'] = iconFontTemplate.dst
    nuxt.options.alias['#brickflow-ui-options'] = uiOptionsTemplate.dst

    nuxt.hook('pages:extend', (pages) => {
      pages.push({
        file: resolver.resolve('./runtime/pages/ui.vue'),
        meta: {
          layout: false,
        },
        name: 'brickflow-ui',
        path: '/ui',
      })
    })

    nuxt.hook('builder:watch', async (_event, path) => {
      const absolutePath = resolve(nuxt.options.srcDir, path)
      const isConfigFile = absolutePath === resolvedConfigPath
      const isRuntimeFile =
        !relative(runtimePath, absolutePath).startsWith('..') && UI_STYLE_FILE_PATTERN.test(path)

      if (!isConfigFile && !isRuntimeFile) {
        return
      }

      await updateTemplates({
        filter: (template) =>
          template.filename === uiStyleTypeTemplate.filename ||
          template.filename === uiConfigLiteralTypeTemplate.filename ||
          template.filename === uiConfigSchemaTypeTemplate.filename,
      })

      if (
        isConfigFile ||
        (!relative(componentsDirectory, absolutePath).startsWith('..') &&
          (UI_COMPONENT_FILE_PATTERN.test(path) || UI_DEMO_FILE_PATTERN.test(path)))
      ) {
        await updateTemplates({ filter: (template) => template.filename === uiCatalogTemplate.filename })
      }
    })

    nuxt.hook('vite:extendConfig', (config) => {
      const viteConfig = config as ViteConfig
      viteConfig.plugins ??= []
      if (iconFont) {
        viteConfig.build ??= {}
        viteConfig.build.assetsInlineLimit = createIconFontAssetsInlineLimit(
          iconFont.outputDir,
          viteConfig.build.assetsInlineLimit,
        )
        viteConfig.plugins.push(brickflowUiIconFontPlugin(iconFont) as unknown)
      }
      viteConfig.plugins.push(
        brickflowUiStylePlugin({
          configPath: resolvedConfigPath,
          getConfig: async () => (await loadUiConfig()).uiConfig,
          getStyles: async () => (await loadUiConfig()).uiStyles,
        }) as unknown,
      )
      if (options.theme) {
        viteConfig.plugins.push(brickflowUiTailwindVariantPlugin() as unknown)
      }
      viteConfig.plugins.push(tailwindcss() as unknown)
    })

    addImportsDir(resolver.resolve('./runtime/composables'))
    addComponentsDir({
      ignore: ['**/*.demo.vue'],
      path: resolver.resolve('./runtime/components'),
      pathPrefix: false,
      prefix: options.componentPrefix ?? 'Brick',
    })
  },
})
