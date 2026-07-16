import { basename, dirname, extname, resolve } from 'node:path'

import type { BrickflowUiStyles } from '../runtime/tailwind'

interface BrickflowUiStylePluginOptions {
  configPath: string
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

interface UiStyleTypeDeclarationOptions {
  configPaths: string[][]
  paths: string[][]
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
  const configName = componentName === 'index' ? basename(dirname(cleanId)) : componentName

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

const renderTypeTree = (tree: UiStylePathTree, level: number, objectType?: string): string[] => {
  const lines: string[] = []
  const indent = TYPE_INDENT.repeat(level)
  for (const [key, childTree] of [...tree.children.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (childTree.children.size === 0) {
      lines.push(`${indent}readonly ${key}: string`)
      continue
    }

    lines.push(objectType ? `${indent}readonly ${key}: ${objectType} & {` : `${indent}readonly ${key}: {`)
    lines.push(...renderTypeTree(childTree, level + 1, objectType))
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

const renderInterfaceDeclaration = (name: string, paths: string[][], objectType?: string): string[] => {
  const tree = createUiStylePathTree()

  for (const path of paths) {
    addPathToTree(tree, path)
  }

  return [`  interface ${name} {`, ...renderTypeTree(tree, 2, objectType), '  }']
}

export const createUiStyleTypeDeclaration = (options: UiStyleTypeDeclarationOptions): string => {
  return [
    'declare global {',
    ...renderInterfaceDeclaration('BrickflowUiConfigStylePaths', options.configPaths),
    '',
    ...renderInterfaceDeclaration('BrickflowUiStylePaths', options.paths, 'BrickflowUiStyleValue'),
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
    if (!SCRIPT_FILE_PATTERN.test(id) || !code.includes('UI_STYLE.')) {
      return null
    }

    this.addWatchFile?.(options.configPath)

    const styles = await options.getStyles()
    let changed = false

    const transformedCode = code.replace(UI_STYLE_PATTERN, (match, rawPath: string) => {
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
