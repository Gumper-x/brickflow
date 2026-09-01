import { basename, dirname, extname, resolve } from 'node:path'

import {
  type BrickflowUiConfigObject,
  type BrickflowUiConfigValue,
  type BrickflowUiStyles,
  getBrickflowUiStyleReferencePath,
  isBrickflowUiStyleReference,
} from '../runtime/tailwind'

export interface UiConfigSchemaEntry {
  path: string[]
  schema: string
}

interface BrickflowUiStylePluginOptions {
  configPath: string
  getConfig: () => Promise<BrickflowUiConfigObject>
  getStyles: () => Promise<BrickflowUiStyles>
}

type HmrContext = {
  file: string
  server: ViteDevServer
}

type PluginContext = {
  addWatchFile?: (id: string) => void
  error: (message: string) => never
}

type UiStyleLeafType = ((path: string[]) => string) | string

interface UiStyleTypeDeclarationOptions {
  configPaths: string[][]
  paths: string[][]
  uiConfigPaths: string[][]
}

type ViteDevServer = {
  httpServer?: null | {
    once: (event: 'listening', listener: () => void) => void
  }
  moduleGraph: {
    invalidateAll: () => void
  }
  watcher: {
    add: (path: string) => void
  }
  ws: {
    send: (payload: { type: 'full-reload' }) => void
  }
}

type VitePlugin = {
  buildStart?: {
    handler: (this: PluginContext) => void
  }
  configureServer?: (server: ViteDevServer) => void
  enforce: 'pre'
  handleHotUpdate?: (context: HmrContext) => [] | void
  name: string
  transform: (this: PluginContext, code: string, id: string) => Promise<null | { code: string; map: null }>
}

const UI_STYLE_PATTERN = /\bUI_STYLE((?:\.[A-Za-z_$][\w$]*)+)/g
const UI_CONFIG_PATTERN = /\bUI_CONFIG((?:\.[A-Za-z_$][\w$]*)+)/g
const UI_CONFIG_MACRO = 'defineUiConfig'
const SCRIPT_FILE_PATTERN = /\.(?:[cm]?[jt]sx?|vue)(?:\?.*)?$/
const TYPE_INDENT = '  '

const refreshUiStyleModules = (server: ViteDevServer): void => {
  server.moduleGraph.invalidateAll()
  server.ws.send({ type: 'full-reload' })
}

const normalizePath = (path: string): string => resolve(path).replaceAll('\\', '/')

const toCamelCase = (value: string): string => {
  const normalized = value
    .replace(/^[^a-z_$]+/iu, '')
    .replace(/[^\w$]+([\w$])/gu, (_, letter: string) => letter.toUpperCase())

  return normalized ? `${normalized[0]?.toLowerCase()}${normalized.slice(1)}` : ''
}

const toStringLiteral = (value: string): string =>
  `'${value
    .replaceAll('\\', '\\\\')
    .replaceAll("'", "\\'")
    .replaceAll('\r', '\\r')
    .replaceAll('\n', '\\n')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')}'`

const readPath = (source: unknown, path: string[]): unknown =>
  path.reduce<unknown>((value, key) => {
    if (!value || typeof value !== 'object') {
      return undefined
    }

    return (value as Record<string, unknown>)[key]
  }, source)

const resolveUiStyleConfigPath = (id: string, path: string[]): string[] => {
  const cleanId = id.split('?')[0] ?? id

  if (!cleanId.endsWith('.vue')) {
    return path
  }

  const componentName = basename(cleanId, extname(cleanId))
  const configName =
    componentName === 'index' || componentName.endsWith('.demo') ? basename(dirname(cleanId)) : componentName

  return [toCamelCase(configName), ...path]
}

const resolveStyleValue = (styles: BrickflowUiStyles, id: string, path: string[]): unknown => {
  const configPathValue = readPath(styles, resolveUiStyleConfigPath(id, path))

  if (typeof configPathValue === 'string') {
    return configPathValue
  }

  const globalValue = readPath(styles, path)

  if (typeof globalValue === 'string') {
    return globalValue
  }

  return configPathValue ?? globalValue
}

const resolveUiConfigValue = (
  config: BrickflowUiConfigObject,
  id: string,
  path: string[],
): BrickflowUiConfigValue | undefined => {
  const configPathValue = readPath(config, resolveUiStyleConfigPath(id, path))

  return (configPathValue ?? readPath(config, path)) as BrickflowUiConfigValue | undefined
}

const resolveUiConfigStyleReferences = (
  value: BrickflowUiConfigValue,
  styles: BrickflowUiStyles,
  id: string,
): unknown => {
  if (isBrickflowUiStyleReference(value)) {
    const stylePath = getBrickflowUiStyleReferencePath(value)
    const styleValue = resolveStyleValue(styles, id, [...stylePath])

    if (typeof styleValue !== 'string') {
      throw new TypeError(`UI_STYLE.${stylePath.join('.')} does not resolve to a string in ${id}.`)
    }

    return styleValue
  }

  if (typeof value === 'string') {
    return value
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, childValue]) => [
      key,
      resolveUiConfigStyleReferences(childValue, styles, id),
    ]),
  )
}

const replaceUiConfigMacros = (
  code: string,
  config: BrickflowUiConfigObject,
  styles: BrickflowUiStyles,
  id: string,
  error: (message: string) => never,
): string => {
  let result = ''
  let cursor = 0

  while (cursor < code.length) {
    const start = code.indexOf(UI_CONFIG_MACRO, cursor)

    if (start === -1) {
      return result + code.slice(cursor)
    }

    const genericStart = start + UI_CONFIG_MACRO.length
    if (code[genericStart] !== '<') {
      result += code.slice(cursor, genericStart)
      cursor = genericStart
      continue
    }

    let depth = 0
    let index = genericStart
    for (; index < code.length; index += 1) {
      if (code[index] === '<') {
        depth += 1
      }
      if (code[index] === '>') {
        depth -= 1
      }
      if (depth === 0) {
        break
      }
    }

    let callStart = index + 1
    while (/\s/u.test(code[callStart] ?? '')) {
      callStart += 1
    }
    if (code.slice(callStart, callStart + 2) !== '()') {
      result += code.slice(cursor, callStart)
      cursor = callStart
      continue
    }

    const value = resolveUiConfigValue(config, id, [])
    if (value === undefined) {
      error(`defineUiConfig() in ${id} has no matching uiConfig entry.`)
    }

    result += code.slice(cursor, start)
    result += JSON.stringify(resolveUiConfigStyleReferences(value, styles, id))
    cursor = callStart + 2
  }

  return result
}

type UiStylePathTree = {
  children: Map<string, UiStylePathTree>
}

const createUiStylePathTree = (): UiStylePathTree => ({
  children: new Map<string, UiStylePathTree>(),
})

const addPathToTree = (tree: UiStylePathTree, path: string[]): void => {
  let currentTree = tree

  for (const segment of path) {
    const childTree = currentTree.children.get(segment) ?? createUiStylePathTree()

    currentTree.children.set(segment, childTree)
    currentTree = childTree
  }
}

const renderTypeTree = (
  tree: UiStylePathTree,
  level: number,
  objectType?: string,
  leafType: UiStyleLeafType = 'string',
  path: string[] = [],
): string[] => {
  const lines: string[] = []
  const indent = TYPE_INDENT.repeat(level)
  for (const [key, childTree] of [...tree.children.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (childTree.children.size === 0) {
      const childPath = [...path, key]
      const childLeafType = typeof leafType === 'function' ? leafType(childPath) : leafType

      lines.push(`${indent}readonly ${key}: ${childLeafType}`)
      continue
    }

    lines.push(objectType ? `${indent}readonly ${key}: ${objectType} & {` : `${indent}readonly ${key}: {`)
    lines.push(...renderTypeTree(childTree, level + 1, objectType, leafType, [...path, key]))
    lines.push(`${indent}}`)
  }

  return lines
}

export const collectUiStylePathsFromCode = (code: string): string[][] => {
  const paths: string[][] = []

  for (const match of code.matchAll(UI_STYLE_PATTERN)) {
    paths.push(match[1]?.slice(1).split('.') ?? [])
  }

  return paths.filter((path) => path.length > 0)
}

export const collectUiStyleConfigPathsFromCode = (code: string, id: string): string[][] =>
  collectUiStylePathsFromCode(code).map((path) => resolveUiStyleConfigPath(id, path))

const collectUiConfigValuePaths = (value: BrickflowUiConfigValue, prefix: string[]): string[][] => {
  if (typeof value === 'string' || isBrickflowUiStyleReference(value)) {
    return [prefix]
  }

  return Object.entries(value).flatMap(([key, childValue]) =>
    collectUiConfigValuePaths(childValue, [...prefix, key]),
  )
}

export const collectUiConfigPathsFromCode = (
  code: string,
  id: string,
  config: BrickflowUiConfigObject,
): string[][] => {
  const paths: string[][] = []

  for (const match of code.matchAll(UI_CONFIG_PATTERN)) {
    const path = match[1]?.slice(1).split('.') ?? []
    const value = resolveUiConfigValue(config, id, path)

    paths.push(...(value === undefined ? [path] : collectUiConfigValuePaths(value, path)))
  }

  return paths.filter((path) => path.length > 0)
}

export const collectUiConfigComponentPathsFromCode = (
  code: string,
  id: string,
  config: BrickflowUiConfigObject,
): string[][] => {
  const paths: string[][] = []

  for (const match of code.matchAll(UI_CONFIG_PATTERN)) {
    const path = match[1]?.slice(1).split('.') ?? []
    const componentPath = resolveUiStyleConfigPath(id, path)
    const value = readPath(config, componentPath)

    paths.push(
      ...(value === undefined
        ? [componentPath]
        : collectUiConfigValuePaths(value as BrickflowUiConfigValue, componentPath)),
    )
  }

  if (code.includes(UI_CONFIG_MACRO)) {
    const componentPath = resolveUiStyleConfigPath(id, [])
    const value = readPath(config, componentPath)

    if (value !== undefined) {
      paths.push(...collectUiConfigValuePaths(value as BrickflowUiConfigValue, componentPath))
    }
  }

  return paths.filter((path) => path.length > 0)
}

export const collectUiConfigSchemaEntriesFromCode = (code: string, id: string): UiConfigSchemaEntry[] => {
  const entries: UiConfigSchemaEntry[] = []
  let cursor = 0

  while (cursor < code.length) {
    const start = code.indexOf(UI_CONFIG_MACRO, cursor)

    if (start === -1) {
      return entries
    }

    const genericStart = start + UI_CONFIG_MACRO.length
    if (code[genericStart] !== '<') {
      cursor = genericStart
      continue
    }

    let depth = 0
    let genericEnd = genericStart
    for (; genericEnd < code.length; genericEnd += 1) {
      if (code[genericEnd] === '<') {
        depth += 1
      }
      if (code[genericEnd] === '>') {
        depth -= 1
      }
      if (depth === 0) {
        break
      }
    }

    let callStart = genericEnd + 1
    while (/\s/u.test(code[callStart] ?? '')) {
      callStart += 1
    }
    if (code.slice(callStart, callStart + 2) !== '()') {
      cursor = callStart
      continue
    }

    const schema = code.slice(genericStart + 1, genericEnd).trim()
    const path = resolveUiStyleConfigPath(id, [])
    if (schema.startsWith('{') && path.length > 0) {
      entries.push({ path, schema })
    }

    cursor = callStart + 2
  }

  return entries
}

const collectUiConfigStyleReferencePathsFromValue = (
  value: BrickflowUiConfigValue,
  componentPath: string[],
): string[][] => {
  if (isBrickflowUiStyleReference(value)) {
    return [[...componentPath, ...getBrickflowUiStyleReferencePath(value)]]
  }

  if (typeof value === 'string') {
    return []
  }

  return Object.values(value).flatMap((childValue) =>
    collectUiConfigStyleReferencePathsFromValue(childValue, componentPath),
  )
}

export const collectUiConfigStyleReferencePaths = (config: BrickflowUiConfigObject): string[][] =>
  Object.entries(config).flatMap(([key, value]) => collectUiConfigStyleReferencePathsFromValue(value, [key]))

const renderInterfaceDeclaration = (
  name: string,
  paths: string[][],
  objectType?: string,
  leafType: UiStyleLeafType = 'string',
): string[] => {
  const tree = createUiStylePathTree()

  for (const path of paths) {
    addPathToTree(tree, path)
  }

  return [`  interface ${name} {`, ...renderTypeTree(tree, 2, objectType, leafType), '  }']
}

export const createUiStyleTypeDeclaration = (options: UiStyleTypeDeclarationOptions): string => {
  return [
    'declare global {',
    ...renderInterfaceDeclaration('BrickflowUiConfigStylePaths', options.configPaths),
    '',
    ...renderInterfaceDeclaration('BrickflowUiConfigPaths', options.uiConfigPaths),
    '',
    ...renderInterfaceDeclaration('BrickflowUiStylePaths', options.paths, 'BrickflowUiStyleValue'),
    '}',
    '',
    'export {}',
    '',
  ].join('\n')
}

export const createUiConfigLiteralTypeDeclaration = (
  paths: string[][],
  config?: BrickflowUiConfigObject,
): string =>
  [
    'declare global {',
    ...renderInterfaceDeclaration('BrickflowUiConfigLiteralPaths', paths, undefined, (path) => {
      const value = config ? readPath(config, path) : undefined

      return typeof value === 'string' ? toStringLiteral(value) : 'string'
    }),
    '}',
    '',
    'export {}',
    '',
  ].join('\n')

export const createUiConfigSchemaTypeDeclaration = (entries: UiConfigSchemaEntry[]): string => {
  const schemasByPath = new Map<string, string[]>()

  for (const { path, schema } of entries) {
    const pathKey = path.join('.')
    const schemas = schemasByPath.get(pathKey) ?? []

    schemas.push(schema)
    schemasByPath.set(pathKey, schemas)
  }

  return [
    'declare global {',
    '  interface BrickflowUiConfigSchema {',
    ...[...schemasByPath.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, schemas]) => {
        const [componentName] = path.split('.')

        return `    readonly ${componentName}: ${schemas.map((schema) => `(${schema})`).join(' & ')}`
      }),
    '  }',
    '}',
    '',
    'export {}',
    '',
  ].join('\n')
}

export const brickflowUiStylePlugin = (options: BrickflowUiStylePluginOptions): VitePlugin => ({
  buildStart: {
    handler() {
      this.addWatchFile?.(options.configPath)
    },
  },
  configureServer(server) {
    server.watcher.add(options.configPath)
    server.httpServer?.once('listening', () => {
      setTimeout(() => refreshUiStyleModules(server), 0)
    })
  },
  enforce: 'pre',
  handleHotUpdate(context) {
    if (normalizePath(context.file) !== normalizePath(options.configPath)) {
      return
    }

    refreshUiStyleModules(context.server)

    return []
  },
  name: 'brickflow-ui-style',
  async transform(code, id) {
    if (
      !SCRIPT_FILE_PATTERN.test(id) ||
      (!code.includes('UI_STYLE.') && !code.includes('UI_CONFIG.') && !code.includes(UI_CONFIG_MACRO))
    ) {
      return null
    }

    this.addWatchFile?.(options.configPath)

    const styles = await options.getStyles()
    const config = await options.getConfig()
    const isConfigFile = normalizePath(id.split('?')[0] ?? id) === normalizePath(options.configPath)
    const hasUiConfigMacro = code.includes(UI_CONFIG_MACRO)
    let changed = false

    const codeWithUiConfigMacros = hasUiConfigMacro
      ? replaceUiConfigMacros(code, config, styles, id, this.error.bind(this))
      : code
    if (codeWithUiConfigMacros !== code) {
      changed = true
    }

    const transformedCode = codeWithUiConfigMacros
      .replace(UI_CONFIG_PATTERN, (match, rawPath: string) => {
        if (hasUiConfigMacro) {
          return match
        }

        const path = rawPath.slice(1).split('.')
        const value = resolveUiConfigValue(config, id, path)

        changed = true

        if (value === undefined) {
          return 'undefined'
        }

        try {
          const resolvedValue = resolveUiConfigStyleReferences(value, styles, id)

          return typeof resolvedValue === 'string' ? toStringLiteral(resolvedValue) : JSON.stringify(resolvedValue)
        } catch (error) {
          this.error(error instanceof Error ? error.message : String(error))
        }
      })
      .replace(UI_STYLE_PATTERN, (match, rawPath: string) => {
        if (isConfigFile) {
          return match
        }

        const path = rawPath.slice(1).split('.')
        const value = resolveStyleValue(styles, id, path)

        if (typeof value === 'string') {
          changed = true

          return toStringLiteral(value)
        }

        if (value === undefined) {
          changed = true

          return "''"
        }

        this.error(`UI_STYLE path "${match}" in ${id} points to an object. Use a full string path.`)
      })

    return changed ? { code: transformedCode, map: null } : null
  },
})
