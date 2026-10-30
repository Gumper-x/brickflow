import { parse as babelParse } from '@babel/parser'
import traverseModule from '@babel/traverse'
import { isIdentifier, isMemberExpression, isStringLiteral, isTemplateLiteral } from '@babel/types'
import { compileTemplate, parse as parseSFC } from '@vue/compiler-sfc'
import { execFileSync } from 'child_process'
import { createHash } from 'crypto'
import { existsSync, statSync } from 'fs'
import { globSync } from 'glob'
import { dirname, join, relative, resolve } from 'path'

import { resolveWorkspaceRoot } from '../shared/workspace-root.js'

const tTraverse = traverseModule.default || traverseModule
const IGNORED_GLOB_PATTERNS = [
  '**/node_modules/**',
  '**/.nuxt/**',
  '**/dist/**',
  '**/.output/**',
  '**/coverage/**',
  '**/public/**',
]
const IGNORED_SOURCE_SEGMENTS = ['/node_modules/', '/.nuxt/', '/dist/', '/.output/', '/coverage/', '/public/']
export const DEFAULT_TRANSLATE_DIRS = ['packages/brick', 'apps/*']
const TRANSLATION_DIRS_GLOB = '{components/**/translate,pages-translate/*,layouts-translate/**,script-translate/*}'

let translateDirs = DEFAULT_TRANSLATE_DIRS
let translateRoots = null
let workspaceRootDir = null

export function compileVueToJS(code, filePath) {
  const { descriptor } = parseSFC(code)

  let result = ''

  if (descriptor.script?.content) {
    result += `${descriptor.script.content}\n`
  }

  if (descriptor.scriptSetup?.content) {
    result += `${descriptor.scriptSetup.content}\n`
  }

  if (descriptor.template?.content) {
    const compiled = compileTemplate({
      filename: filePath,
      id: filePath,
      source: descriptor.template.content,
    })

    result += compiled.code
  }

  return result
}

export function extractStrings(code, id) {
  const ast = babelParse(code, {
    plugins: getBabelPlugins(id),
    sourceType: 'module',
  })

  const result = new Map()
  const component = getComponentName(id)

  tTraverse(ast, {
    CallExpression(pathAst) {
      if (!isTCall(pathAst.node)) {
        return
      }

      const arg = pathAst.node.arguments[0]
      const text = getStaticText(arg)

      if (text === null) {
        return
      }

      const key = generateKey(text, component)

      result.set(key, text)
    },
  })

  return result
}

export function generateKey(text, component) {
  const normalized = normalize(text)
  const cased = toSnake(normalized).slice(0, 10)
  const hash = shortHash(normalized)

  return `${component}.${cased}_${hash}`
}

export function getComponentName(id) {
  const normalizedId = id.replace(/[?#].*$/, '')

  if (/\/pages\//.test(normalizedId)) {
    const pagePath = normalizedId.split('/pages/')[1].replace(/\.\w+$/, '')

    return pagePath
      .split('/')
      .filter(Boolean)
      .map((segment) => toPageSegmentName(segment))
      .join('_')
  }

  if (/\/layouts\//.test(normalizedId)) {
    const layoutPath = normalizedId
      .split('/layouts/')[1]
      .replace(/\.\w+$/, '')
      .replace(/\/index$/, '')
    const segments = [getProjectName(normalizedId), 'layouts', ...layoutPath.split('/').filter(Boolean)]

    return segments.map((segment) => toPascal(segment)).join('')
  }

  if (!normalizedId.endsWith('.vue')) {
    return getScriptName(normalizedId)
  }

  const parts = normalizedId.split('/')
  parts.pop()

  const dirs = parts.slice(-2)

  return dirs.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')
}

export function getProjectName(id) {
  return getProjectRoot(id)?.split('/').pop() ?? 'project'
}

export function getProjectRoot(id) {
  const normalizedId = id.replace(/[?#].*$/, '')

  if (!translateRoots) {
    setTranslateDirs(undefined, resolveWorkspaceRoot())
  }

  return translateRoots.find((rootDir) => normalizedId.startsWith(`${rootDir}/`)) ?? null
}

export function getScriptName(id) {
  const projectRoot = getProjectRoot(id)
  const baseDir = projectRoot ? dirname(projectRoot) : (workspaceRootDir ?? resolveWorkspaceRoot())
  const relativePath = relative(baseDir, id).replace(/\\/g, '/')

  return toPageName(relativePath.replace(/\.\w+$/, '').replace(/\//g, '_'))
}

export function getTranslateDirs() {
  return translateDirs
}

export function getTranslationGlobs(fileName) {
  return translateDirs.map((dir) => `${dir}/${TRANSLATION_DIRS_GLOB}/${fileName}`)
}

export function getTranslationPaths(id) {
  if (isVueSubResourceId(id)) {
    return null
  }

  const normalizedId = id.replace(/[?#].*$/, '')
  if (isIgnoredSourcePath(normalizedId)) {
    return null
  }

  if (normalizedId.endsWith('/book.vue')) {
    return null
  }

  const projectRoot = getProjectRoot(normalizedId)
  if (!projectRoot) {
    return null
  }

  const isComponent = normalizedId.endsWith('.vue') && normalizedId.includes('/components/')
  const isPage = normalizedId.endsWith('.vue') && normalizedId.includes('/pages/')
  const isLayout = normalizedId.endsWith('.vue') && normalizedId.includes('/layouts/')
  const isScript =
    !normalizedId.endsWith('.vue') && /\.(?:js|ts)$/.test(normalizedId) && !normalizedId.endsWith('.d.ts')

  if (isComponent && !normalizedId.endsWith('/index.vue')) {
    return null
  }

  if (!isComponent && !isPage && !isLayout && !isScript) {
    return null
  }

  if (isComponent) {
    const componentDir = normalizedId.split('/').slice(0, -1).join('/')
    const baseDir = join(componentDir, 'translate')

    return {
      baseDir,
      isComponent,
      isPage,
      isScript,
      samplePath: join(baseDir, 'sample.json'),
    }
  }

  if (isPage) {
    const pagesRoot = `${normalizedId.split('/pages/')[0]}/pages`
    const rootDir = join(pagesRoot, '..', 'pages-translate')
    const name = getComponentName(normalizedId)
    const baseDir = join(rootDir, name)

    return {
      baseDir,
      isComponent,
      isPage,
      isScript,
      samplePath: join(baseDir, 'sample.json'),
    }
  }

  if (isLayout) {
    const layoutsRoot = `${normalizedId.split('/layouts/')[0]}/layouts`
    const layoutPath = normalizedId.split('/layouts/')[1].replace(/\.\w+$/, '')
    const baseDir = join(layoutsRoot, '..', 'layouts-translate', layoutPath)

    return {
      baseDir,
      isComponent,
      isLayout,
      isPage,
      isScript,
      samplePath: join(baseDir, 'sample.json'),
    }
  }

  const baseDir = join(projectRoot, 'script-translate', getComponentName(normalizedId))

  return {
    baseDir,
    isComponent,
    isLayout,
    isPage,
    isScript,
    samplePath: join(baseDir, 'sample.json'),
  }
}

export function listTranslationSamplePaths(workspaceRoot) {
  return globSync(getTranslationGlobs('sample.json'), {
    absolute: true,
    cwd: workspaceRoot,
    ignore: IGNORED_GLOB_PATTERNS,
  }).sort()
}

export function listTranslationTargets(workspaceRoot) {
  const samplePaths = listTranslationSamplePaths(workspaceRoot)
  const sourceFiles = listWorkspaceFiles(workspaceRoot).filter(
    (filePath) => /\.(?:js|ts|vue)$/.test(filePath) && !filePath.endsWith('.d.ts'),
  )
  const sampleToSource = new Map()

  for (const sourceFilePath of sourceFiles) {
    const samplePath = getTranslationPaths(sourceFilePath)?.samplePath

    if (samplePath && existsSync(samplePath) && !sampleToSource.has(samplePath)) {
      sampleToSource.set(samplePath, sourceFilePath)
    }
  }

  return samplePaths.map((samplePath) => ({
    samplePath,
    sourceFilePath: sampleToSource.get(samplePath),
  }))
}

export function listWorkspaceFiles(workspaceRoot) {
  try {
    const output = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], {
      cwd: workspaceRoot,
      encoding: 'utf-8',
    })

    return output
      .split('\0')
      .filter(Boolean)
      .map((file) => resolve(workspaceRoot, file))
      .filter((filePath) => existsSync(filePath))
  } catch {
    return globSync('**/*', {
      absolute: true,
      cwd: workspaceRoot,
      ignore: IGNORED_GLOB_PATTERNS,
      nodir: true,
    })
  }
}

export function normalize(input) {
  return input.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function setTranslateDirs(value, workspaceRoot) {
  const dirs =
    value === undefined
      ? DEFAULT_TRANSLATE_DIRS
      : String(value ?? '')
          .split(',')
          .map((dir) => dir.trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, ''))
          .filter(Boolean)

  if (dirs.length === 0) {
    throw new Error(
      'Invalid --dirs value. Use comma-separated directories, for example: --dirs "packages/stem,apps/*"',
    )
  }

  translateDirs = dirs
  workspaceRootDir = workspaceRoot
  translateRoots = globSync(dirs, {
    absolute: true,
    cwd: workspaceRoot,
    ignore: IGNORED_GLOB_PATTERNS,
  })
    .filter((dirPath) => statSync(dirPath).isDirectory())
    .sort((left, right) => right.length - left.length)
}

export function shortHash(input) {
  return createHash('md5').update(input).digest('hex').slice(0, 4)
}

export function sortJsonValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sortJsonValue(item))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, item]) => [key, sortJsonValue(item)]),
    )
  }

  return value
}

export function sortObjectKeys(value) {
  return Object.fromEntries(Object.entries(value).sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey)))
}

export function stringifySortedJson(value) {
  return `${JSON.stringify(sortJsonValue(value), null, 2)}\n`
}

export function toPageName(input) {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-.\s]+/g, '_')
    .replace(/[^\w$]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
}

export function toSnake(input) {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-.\s]+/g, '_')
    .replace(/\W/g, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
}

function getBabelPlugins(id) {
  const normalizedId = id.replace(/[?#].*$/, '')

  if (/\.(?:jsx|tsx)$/.test(normalizedId)) {
    return ['typescript', 'jsx']
  }

  return ['typescript']
}

function getStaticText(node) {
  if (!node) {
    return null
  }

  if (isStringLiteral(node)) {
    return node.value
  }

  if (isTemplateLiteral(node) && node.expressions.length === 0) {
    return node.quasis.map((quasi) => quasi.value.cooked ?? quasi.value.raw).join('')
  }

  return null
}

function isIgnoredSourcePath(id) {
  return IGNORED_SOURCE_SEGMENTS.some((segment) => id.includes(segment))
}

function isTCall(node) {
  const callee = node.callee

  if (isIdentifier(callee) && callee.name === 't') {
    return true
  }

  if (isMemberExpression(callee) && isIdentifier(callee.property) && callee.property.name === 't') {
    if (isIdentifier(callee.object, { name: 'currentI18n' })) {
      return false
    }

    return true
  }

  return false
}

function isVueSubResourceId(id) {
  return /[?&]vue&type=/.test(id)
}

function toPageSegmentName(segment) {
  const dynamicMatch = segment.match(/^\[([^\]]+)\]$/)

  if (dynamicMatch) {
    return `$${dynamicMatch[1]}`
  }

  return toSnake(segment)
}

function toPascal(input) {
  return toSnake(input)
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}
