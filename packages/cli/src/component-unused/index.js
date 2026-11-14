import { parse as parseCode } from '@babel/parser'
import traverseModule from '@babel/traverse'
import { parse as parseVue } from '@vue/compiler-sfc'
import { globSync } from 'glob'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { createProgress } from '../shared/progress.js'
import { resolveWorkspaceRoot } from '../shared/workspace-root.js'

const traverse = traverseModule.default || traverseModule
const ignored = [
  '**/node_modules/**',
  '**/.nuxt/**',
  '**/.output/**',
  '**/dist/**',
  '**/coverage/**',
  '**/.git/**',
  '**/*.demo.vue',
  '**/*.d.ts',
  '**/tests/**',
  '**/__tests__/**',
]
const args = process.argv.slice(3)
const color = process.env.FORCE_COLOR
  ? process.env.FORCE_COLOR !== '0'
  : !process.env.NO_COLOR && process.stdout.isTTY
const links = process.env.FORCE_HYPERLINK === '1' || (process.stdout.isTTY && process.env.TERM !== 'dumb')
const paint = (value, code) => (color ? `\u001b[${code}m${value}\u001b[0m` : value)
const key = (value) => value.replace(/[^a-z0-9]/gi, '').toLowerCase()
const pascal = (value) =>
  value
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('')

function componentDirectories(config, dir, sourceDir) {
  const configured = property(config, 'components')
  let entries = null
  if (configured?.type === 'ArrayExpression') {
    entries = configured.elements
  } else if (configured?.type === 'ObjectExpression') {
    const dirs = property(configured, 'dirs')
    if (dirs?.type === 'ArrayExpression') {
      entries = dirs.elements
    }
  }

  if (!entries) {
    return [
      { pathPrefix: true, prefix: '', root: path.join(sourceDir, 'components') },
      { pathPrefix: true, prefix: '', root: path.join(sourceDir, 'app/components') },
    ]
  }

  return entries.flatMap((entry) => {
    const location = entry?.type === 'StringLiteral' ? entry.value : property(entry, 'path')?.value
    if (typeof location !== 'string') {
      return []
    }
    let root
    if (location.startsWith('~~/') || location.startsWith('@@/')) {
      root = path.resolve(dir, location.slice(3))
    } else if (location.startsWith('~/') || location.startsWith('@/')) {
      root = path.resolve(sourceDir, location.slice(2))
    } else {
      root = path.resolve(dir, location)
    }
    const prefixNode = property(entry, 'prefix')
    const pathPrefixNode = property(entry, 'pathPrefix')
    return [
      {
        pathPrefix: pathPrefixNode?.value !== false,
        prefix: prefixNode?.type === 'StringLiteral' ? prefixNode.value : '',
        root,
      },
    ]
  })
}

function configObject(ast) {
  const expression = ast.program.body.find((item) => item.type === 'ExportDefaultDeclaration')?.declaration
  return expression?.type === 'CallExpression' ? expression.arguments[0] : expression
}

function fileLink(file) {
  const name = path.relative(process.cwd(), file) || file
  const label = paint(name.startsWith('..') ? file : name, '36')
  return links ? `\u001b]8;;${pathToFileURL(file).href}\u001b\\${label}\u001b]8;;\u001b\\` : label
}

function option(name) {
  const index = args.indexOf(name)
  if (index < 0) {
    return null
  }
  if (!args[index + 1] || args[index + 1].startsWith('--')) {
    throw new Error(`${name} requires a directory`)
  }
  return path.resolve(args[index + 1])
}

function parseScript(source, file) {
  try {
    const plugins = ['typescript']
    if (/\.[jt]sx$/i.test(file)) {
      plugins.push('jsx')
    }
    return parseCode(source, { plugins, sourceType: 'unambiguous' })
  } catch (error) {
    throw new Error(`Cannot parse ${file}: ${error.message}`, { cause: error })
  }
}

function property(object, name) {
  return object?.properties?.find(
    (item) => item.type === 'ObjectProperty' && (item.key.name || item.key.value) === name,
  )?.value
}

async function readProject(dir) {
  const configFile = ['nuxt.config.ts', 'nuxt.config.js', 'nuxt.config.mjs', 'nuxt.config.mts']
    .map((name) => path.join(dir, name))
    .find(existsSync)
  if (!configFile) {
    return null
  }
  const ast = parseCode(await readFile(configFile, 'utf8'), { plugins: ['typescript'], sourceType: 'unambiguous' })
  const config = configObject(ast)
  const extendsNode = property(config, 'extends')
  let layerNodes = []
  if (extendsNode?.type === 'ArrayExpression') {
    layerNodes = extendsNode.elements
  } else if (extendsNode) {
    layerNodes = [extendsNode]
  }
  const layers = layerNodes
    .filter((node) => node?.type === 'StringLiteral' && /^\.{1,2}(?:\/|$)/.test(node.value))
    .map((node) => path.resolve(dir, node.value))
  const sourceNode = property(config, 'srcDir')
  const sourceDir = sourceNode?.type === 'StringLiteral' ? path.resolve(dir, sourceNode.value) : dir
  const directories = componentDirectories(config, dir, sourceDir)
  const components = []
  for (const { pathPrefix, prefix, root } of directories.filter((item) => existsSync(item.root))) {
    for (const file of globSync('**/*.vue', { absolute: true, cwd: root, ignore: ignored, nodir: true })) {
      const relative = path
        .relative(root, file)
        .replace(/(?:\.(?:client|server))?\.vue$/i, '')
        .split(path.sep)
      if (relative.some((part) => part.startsWith('_'))) {
        continue
      }
      if (relative.at(-1).toLowerCase() === 'index') {
        relative.pop()
      }
      const parts = relative.map(pascal).filter(Boolean)
      // Nuxt removes duplicate adjacent path parts, e.g. Button/Button.vue.
      const compact = parts.filter((part, index) => index === 0 || part !== parts[index - 1])
      const name = `${pascal(prefix)}${pathPrefix ? compact.join('') : compact.at(-1) || ''}`
      if (name) {
        components.push({ file, name, project: dir, usedBy: new Set() })
      }
    }
  }
  return {
    components,
    dir,
    files: globSync('**/*.{vue,ts,tsx,js,jsx,mjs,mts}', {
      absolute: true,
      cwd: dir,
      ignore: ignored,
      nodir: true,
    }).filter(
      (file) => !directories.some(({ root }) => file.startsWith(`${root}${path.sep}`) && !file.endsWith('.vue')),
    ),
    layers,
  }
}

async function run() {
  const root = option('--root') || resolveWorkspaceRoot()
  const target = option('--app')
  const configFiles = globSync('**/nuxt.config.{ts,js,mjs,mts}', { absolute: true, cwd: root, ignore: ignored })
  const directories = new Set(configFiles.map(path.dirname))
  if (target) {
    directories.add(target)
  }
  const projects = new Map()
  for (const dir of directories) {
    const project = await readProject(dir)
    if (project) {
      projects.set(dir, project)
      for (const layer of project.layers) {
        if (!projects.has(layer)) {
          directories.add(layer)
        }
      }
    }
  }
  if (target && !projects.has(target)) {
    throw new Error(`Nuxt project not found: ${target}`)
  }
  if (!projects.size) {
    throw new Error(`No local Nuxt projects found in ${root}`)
  }
  for (const project of projects.values()) {
    project.files = project.files.filter(
      (file) =>
        ![...projects.keys()].some((other) => other !== project.dir && file.startsWith(`${other}${path.sep}`)),
    )
  }

  const chain = (dir, seen = new Set()) => {
    if (seen.has(dir) || !projects.has(dir)) {
      return []
    }
    seen.add(dir)
    return [projects.get(dir), ...projects.get(dir).layers.flatMap((layer) => chain(layer, seen))]
  }
  const allComponents = [...projects.values()].flatMap((project) => project.components)
  const files = [...projects.values()].flatMap((project) => project.files.map((file) => ({ file, project })))
  console.log(`\n${paint('◆ Nuxt component usage', '1;36')}`)
  console.log(`${'Projects'.padEnd(20)} ${projects.size}`)
  console.log(`${'Components'.padEnd(20)} ${allComponents.length}`)
  const progress = createProgress('Scanning source files', files.length)
  try {
    for (const { file, project } of files) {
      const available = new Map()
      for (const scope of chain(project.dir)) {
        for (const component of scope.components) {
          for (const name of [component.name, `Lazy${component.name}`]) {
            if (!available.has(key(name))) {
              available.set(key(name), component)
            }
          }
        }
      }
      const use = (name) => {
        const component = available.get(key(name))
        if (component && component.file !== file) {
          component.usedBy.add(project.dir)
        }
      }
      const source = await readFile(file, 'utf8')
      if (file.endsWith('.vue')) {
        const { descriptor, errors } = parseVue(source, { filename: file })
        if (errors.length) {
          throw new Error(`Cannot parse ${file}: ${errors[0].message}`)
        }
        scanTemplate(descriptor.template?.ast, use)
        for (const block of [descriptor.script, descriptor.scriptSetup].filter(Boolean)) {
          scanScript(block.content, /^[jt]sx$/.test(block.attrs.lang) ? `${file}.tsx` : file, use)
        }
      } else if (!file.includes(`${path.sep}nuxt.config.`)) {
        scanScript(source, file, use)
      }
      progress.tick()
    }
  } finally {
    progress.finish()
  }

  const selected = target ? projects.get(target).components : allComponents
  const unused = selected
    .filter((component) => component.usedBy.size === 0)
    .sort((a, b) => a.file.localeCompare(b.file))
  const inherited = selected.filter(
    (component) => !component.usedBy.has(component.project) && component.usedBy.size > 0,
  )
  console.log(`\n${'Used'.padEnd(20)} ${paint(String(selected.length - unused.length), '32')}`)
  console.log(`${'Unused'.padEnd(20)} ${paint(String(unused.length), unused.length ? '1;33' : '32')}`)
  console.log(`${'Used by consumers'.padEnd(20)} ${paint(String(inherited.length), '35')}`)
  if (unused.length) {
    console.log(`\n${paint(`✖ Unused in all local projects (${unused.length})`, '1;33')}`)
    const nameWidth = Math.max(28, ...unused.map((component) => component.name.length + 2))
    console.log(`${paint('Name'.padEnd(nameWidth), '2')} ${paint('File', '2')}`)
    for (const component of unused) {
      console.log(`${paint(component.name.padEnd(nameWidth), '33')} ${fileLink(component.file)}`)
    }
  } else {
    console.log(`\n${paint('✓ No unused components', '32')}`)
  }
  if (inherited.length) {
    console.log(`\n${paint(`◆ Used only by layer consumers (${inherited.length})`, '1;35')}`)
    const nameWidth = Math.max(28, ...inherited.map((component) => component.name.length + 2))
    console.log(`${paint('Name'.padEnd(nameWidth), '2')} ${paint('File', '2')}  ${paint('Consumers', '2')}`)
    for (const component of inherited) {
      console.log(
        `${paint(component.name.padEnd(nameWidth), '35')} ${fileLink(component.file)}  ${[...component.usedBy].map((dir) => path.relative(root, dir) || '.').join(', ')}`,
      )
    }
  }
  console.log()
  if (unused.length) {
    process.exitCode = 1
  }
}

function scanScript(source, file, use) {
  if (!source.trim()) {
    return
  }
  traverse(parseScript(source, file), {
    CallExpression(nodePath) {
      const node = nodePath.node
      if (
        node.callee.type === 'Identifier' &&
        ['resolveComponent', 'resolveDynamicComponent'].includes(node.callee.name) &&
        node.arguments[0]?.type === 'StringLiteral'
      ) {
        use(node.arguments[0].value)
      }
    },
    Identifier(nodePath) {
      if (nodePath.isReferencedIdentifier()) {
        use(nodePath.node.name)
      }
    },
    ImportDeclaration(nodePath) {
      if (nodePath.node.source.value === '#components') {
        for (const specifier of nodePath.node.specifiers) {
          if (specifier.type === 'ImportSpecifier') {
            use(specifier.imported.name || specifier.imported.value)
          }
        }
      }
    },
  })
}

function scanTemplate(node, use) {
  if (!node) {
    return
  }
  if (node.type === 1) {
    use(node.tag)
    for (const prop of node.props) {
      if (prop.type === 6 && prop.name === 'is' && prop.value) {
        use(prop.value.content)
      }
      if (prop.type === 7 && prop.name === 'bind' && prop.arg?.content === 'is' && prop.exp) {
        const value = prop.exp.content.trim().match(/^['"]([^'"]+)['"]$/)
        if (value) {
          use(value[1])
        }
      }
      if (prop.type === 7 && prop.exp && prop.name !== 'for') {
        scanTemplateExpression(prop.exp.content, use)
      }
    }
  }
  if (node.type === 5) {
    scanTemplateExpression(node.content.content, use)
  }
  for (const child of node.children || []) {
    scanTemplate(child, use)
  }
  for (const branch of node.branches || []) {
    scanTemplate(branch, use)
  }
}

function scanTemplateExpression(expression, use) {
  try {
    scanScript(`(${expression})`, '<template>', use)
  } catch {
    // Vue directive syntax can differ from standalone JavaScript expressions.
  }
}

if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: brick component-unused [--app <nuxt-project>] [--root <workspace>]')
  console.log('Scans all local Nuxt projects in the workspace; --app limits the reported components.')
} else {
  await run()
}
