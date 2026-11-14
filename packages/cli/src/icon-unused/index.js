import { parse as parseCode, parseExpression } from '@babel/parser'
import traverseModule from '@babel/traverse'
import { parse as parseVue } from '@vue/compiler-sfc'
import { globSync } from 'glob'
import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const traverse = traverseModule.default || traverseModule
const cliDir = path.dirname(fileURLToPath(import.meta.url))
const localUiComponentsDir = path.resolve(cliDir, '../../../ui/src/runtime/components')
const ignored = [
  '**/node_modules/**',
  '**/.nuxt/**',
  '**/.output/**',
  '**/dist/**',
  '**/coverage/**',
  '**/*.demo.vue',
  '**/*.d.ts',
  '**/tests/**',
]

const args = process.argv.slice(3)
const appArgument = args.indexOf('--app')
const colorEnabled = process.env.FORCE_COLOR
  ? process.env.FORCE_COLOR !== '0'
  : !process.env.NO_COLOR && process.stdout.isTTY
const linksEnabled = process.env.FORCE_HYPERLINK === '1' || (process.stdout.isTTY && process.env.TERM !== 'dumb')

if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: brick icon-unused --app <nuxt-app-directory>')
} else if (appArgument < 0 || !args[appArgument + 1]) {
  throw new Error('Pass --app <nuxt-app-directory>')
} else {
  await run(path.resolve(args[appArgument + 1]))
}

function camelCase(value) {
  return value.replace(/-([a-z])/g, (_, character) => character.toUpperCase())
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function collectConfigIcons(call, configIconPaths, file, record, unresolved) {
  const uiConfig = objectValue(call.arguments[0], 'uiConfig')
  if (uiConfig?.type !== 'ObjectExpression') {
    return
  }
  for (const component of uiConfig.properties) {
    if (component.type !== 'ObjectProperty' || component.value.type !== 'ObjectExpression') {
      continue
    }
    for (const field of component.value.properties) {
      if (field.type !== 'ObjectProperty') {
        continue
      }
      if (!configIconPaths.has(`${propertyName(component.key)}.${propertyName(field.key)}`)) {
        continue
      }
      const name = literalValue(field.value)
      if (name === null) {
        unresolved.push({ file, line: field.loc.start.line, reason: 'dynamic config icon' })
      } else {
        record(name, file, field.loc.start.line)
      }
    }
  }
}

function collectExpression(node, bindings, file, line, record, unresolved, visited = new Set()) {
  if (node.type === 'StringLiteral') {
    record(node.value, file, line)
  } else if (node.type === 'ConditionalExpression') {
    collectExpression(node.consequent, bindings, file, line, record, unresolved, visited)
    collectExpression(node.alternate, bindings, file, line, record, unresolved, visited)
  } else if (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'parseIcon'
  ) {
    collectParseIcon(node, file, record, unresolved)
  } else if (
    node.type === 'CallExpression' &&
    node.callee.type === 'Identifier' &&
    node.callee.name === 'computed' &&
    node.arguments[0]?.type === 'ArrowFunctionExpression' &&
    node.arguments[0].body.type !== 'BlockStatement'
  ) {
    collectExpression(node.arguments[0].body, bindings, file, line, record, unresolved, visited)
  } else if (node.type === 'Identifier' && bindings.has(node.name) && !visited.has(node.name)) {
    visited.add(node.name)
    collectExpression(bindings.get(node.name), bindings, file, line, record, unresolved, visited)
  } else if (
    node.type === 'MemberExpression' &&
    node.object.type === 'Identifier' &&
    ['props', 'UI_CONFIG'].includes(node.object.name)
  ) {
    // A typed config or prop is forwarded; its source is checked separately.
  } else {
    unresolved.push({ file, line, reason: 'dynamic icon expression' })
  }
}

function collectParseIcon(call, file, record, unresolved) {
  const options = call.arguments[1]
  const allowed = objectValue(options, 'allowed')
  const fallback = objectValue(options, 'fallback')
  if (
    allowed?.type !== 'ArrayExpression' ||
    allowed.elements.some((item) => literalValue(item) === null) ||
    literalValue(fallback) === null
  ) {
    unresolved.push({ file, line: call.loc.start.line, reason: 'parseIcon requires literal allowed and fallback' })
    return
  }

  for (const item of allowed.elements) {
    record(item.value, file, item.loc.start.line)
  }
  record(fallback.value, file, fallback.loc.start.line)
}

function containsIconName(node) {
  if (node?.type === 'TSTypeReference') {
    return propertyName(node.typeName) === 'IconName'
  }
  if (node?.type === 'TSUnionType') {
    return node.types.some(containsIconName)
  }
  if (node?.type === 'TSParenthesizedType') {
    return containsIconName(node.typeAnnotation)
  }
  return false
}

function fileLink(file, line = 1) {
  const relativePath = path.relative(process.cwd(), file)
  const displayPath = relativePath.startsWith('..') ? file : relativePath
  const label = paint(`${displayPath}:${line}`, '36')
  return linksEnabled ? `\u001B]8;;${pathToFileURL(file).href}\u001B\\${label}\u001B]8;;\u001B\\` : label
}

function literalValue(node) {
  return node?.type === 'StringLiteral' ? node.value : null
}

function objectValue(object, key) {
  if (object?.type !== 'ObjectExpression') {
    return null
  }
  return (
    object.properties.find((item) => item.type === 'ObjectProperty' && propertyName(item.key) === key)?.value ??
    null
  )
}

function paint(text, code) {
  return colorEnabled ? `\u001B[${code}m${text}\u001B[0m` : text
}

function parseScript(source, file, jsx = false, lineOffset = 0) {
  try {
    return parseCode(source, { plugins: jsx ? ['typescript', 'jsx'] : ['typescript'], sourceType: 'unambiguous' })
  } catch (error) {
    if (error.loc) {
      throw new Error(
        `Cannot parse ${file}:${error.loc.line + lineOffset}:${error.loc.column + 1}: ${error.message}`,
        { cause: error },
      )
    }
    throw error
  }
}

function pascalCase(value) {
  return value.split(/[-_]/).map(capitalize).join('')
}

function propertyName(node) {
  if (!node) {
    return null
  }
  if (node.type === 'Identifier') {
    return node.name
  }
  if (node.type === 'StringLiteral') {
    return node.value
  }
  return null
}

function readNuxtIconOptions(ast, configDir) {
  let options = {}
  const declarations = new Map()
  traverse(ast, {
    VariableDeclarator({ node }) {
      if (node.id.type === 'Identifier') {
        declarations.set(node.id.name, node.init)
      }
    },
  })

  const isImportMetaUrl = (node) =>
    node?.type === 'MemberExpression' &&
    propertyName(node.property) === 'url' &&
    node.object.type === 'MetaProperty' &&
    node.object.meta.name === 'import' &&
    node.object.property.name === 'meta'
  const isCurrentDir = (node, seen = new Set()) => {
    if (node?.type === 'Identifier') {
      if (seen.has(node.name)) {
        return false
      }
      seen.add(node.name)
      return isCurrentDir(declarations.get(node.name), seen)
    }
    if (node?.type === 'MemberExpression') {
      return propertyName(node.property) === 'dirname' && node.object.type === 'MetaProperty'
    }
    if (node?.type !== 'CallExpression' || node.callee.type !== 'Identifier') {
      return false
    }
    if (node.callee.name === 'dirname') {
      const argument = node.arguments[0]
      return (
        argument?.type === 'CallExpression' &&
        argument.callee.type === 'Identifier' &&
        argument.callee.name === 'fileURLToPath' &&
        isImportMetaUrl(argument.arguments[0])
      )
    }
    return (
      node.callee.name === 'fileURLToPath' &&
      node.arguments[0]?.type === 'NewExpression' &&
      node.arguments[0].callee.type === 'Identifier' &&
      node.arguments[0].callee.name === 'URL' &&
      literalValue(node.arguments[0].arguments[0]) === '.' &&
      isImportMetaUrl(node.arguments[0].arguments[1])
    )
  }
  const iconPath = (node) => {
    const literal = literalValue(node)
    if (literal !== null) {
      return literal
    }
    if (
      node?.type !== 'CallExpression' ||
      node.callee.type !== 'Identifier' ||
      node.callee.name !== 'join' ||
      node.arguments.length < 2 ||
      !isCurrentDir(node.arguments[0])
    ) {
      return null
    }
    const segments = node.arguments.slice(1).map(literalValue)
    return segments.includes(null) ? null : path.join(configDir, ...segments)
  }
  traverse(ast, {
    CallExpression({ node }) {
      if (node.callee.type !== 'Identifier' || node.callee.name !== 'defineNuxtConfig') {
        return
      }
      const brickflowUi = objectValue(node.arguments[0], 'brickflowUi')
      options = {
        componentPrefix: literalValue(objectValue(brickflowUi, 'componentPrefix')),
        configPath: literalValue(objectValue(brickflowUi, 'configPath')),
        iconsPath: iconPath(objectValue(brickflowUi, 'iconsPath')),
      }
    },
  })
  return options
}

function readVueTypes(source, file) {
  const { descriptor } = parseVue(source)
  const scripts = [descriptor.script, descriptor.scriptSetup].filter(Boolean)
  const result = { config: new Set(), props: new Set() }

  for (const script of scripts) {
    const ast = parseScript(script.content, file, /^[tj]sx$/.test(script.attrs.lang), script.loc.start.line - 1)
    const aliases = new Map()
    traverse(ast, {
      TSInterfaceDeclaration({ node }) {
        aliases.set(node.id.name, node.body)
      },
      TSTypeAliasDeclaration({ node }) {
        aliases.set(node.id.name, node.typeAnnotation)
      },
    })
    traverse(ast, {
      CallExpression({ node }) {
        if (node.callee.type !== 'Identifier') {
          return
        }
        let target = null
        if (node.callee.name === 'defineProps') {
          target = result.props
        } else if (node.callee.name === 'defineUiConfig') {
          target = result.config
        }
        if (!target) {
          return
        }
        const type = node.typeArguments?.params[0]
        const resolved = type?.type === 'TSTypeReference' ? aliases.get(propertyName(type.typeName)) : type
        if (resolved?.type !== 'TSTypeLiteral' && resolved?.type !== 'TSInterfaceBody') {
          return
        }
        for (const member of resolved.members || resolved.body) {
          if (member.type !== 'TSPropertySignature' || !member.typeAnnotation) {
            continue
          }
          if (containsIconName(member.typeAnnotation.typeAnnotation)) {
            target.add(propertyName(member.key))
          }
        }
      },
    })
  }

  return result
}

function resolveUiComponentsDir(appDir) {
  const installedUiDir = path.join(appDir, 'node_modules/@brickflow/ui')
  const candidates = [
    path.join(installedUiDir, 'src/runtime/components'),
    path.join(installedUiDir, 'dist/runtime/components'),
    localUiComponentsDir,
  ]
  const directory = candidates.find(existsSync)

  if (!directory) {
    throw new Error(`Cannot find @brickflow/ui components for ${appDir}`)
  }

  return directory
}

async function run(appDir) {
  const nuxtConfigPath = path.join(appDir, 'nuxt.config.ts')
  const nuxtConfig = parseScript(await readFile(nuxtConfigPath, 'utf8'), nuxtConfigPath)
  const options = readNuxtIconOptions(nuxtConfig, path.dirname(nuxtConfigPath))

  if (!options.iconsPath) {
    throw new Error(`brickflowUi.iconsPath must be a string literal or join(currentDir, ...) in ${nuxtConfigPath}`)
  }

  const iconsDir = path.resolve(appDir, options.iconsPath)
  const uiComponentsDir = resolveUiComponentsDir(appDir)
  const uiConfigPath = path.resolve(appDir, (options.configPath || 'ui.config.ts').replace(/^~\//, ''))
  const entries = await readdir(iconsDir, { withFileTypes: true })
  const invalidEntries = entries.filter((entry) => !entry.isFile() || !/\.svg$/i.test(entry.name))

  if (invalidEntries.length) {
    throw new Error(`Invalid icon entries: ${invalidEntries.map((entry) => entry.name).join(', ')}`)
  }

  const icons = new Set(entries.map((entry) => entry.name.replace(/\.svg$/i, '')))
  const components = new Map()
  const configIconPaths = new Set()

  for (const file of globSync('**/index.vue', { absolute: true, cwd: uiComponentsDir, ignore: ignored })) {
    const name = `${options.componentPrefix ?? 'Brick'}${path.basename(path.dirname(file))}`
    const source = await readFile(file, 'utf8')
    const types = readVueTypes(source, file)
    components.set(name, types.props)

    for (const key of types.config) {
      configIconPaths.add(`${path.basename(path.dirname(file)).toLowerCase()}.${key}`)
    }
  }

  const appFiles = globSync('**/*.{vue,ts,tsx,js,jsx,mjs}', {
    absolute: true,
    cwd: appDir,
    ignore: ignored,
    nodir: true,
  })

  for (const file of appFiles.filter(
    (candidate) => candidate.includes(`${path.sep}components${path.sep}`) && candidate.endsWith('.vue'),
  )) {
    const relative = path.relative(path.join(appDir, 'components'), file).replace(/\.vue$/, '')
    const parts = relative.split(path.sep).filter((part) => part !== 'index')
    const name = parts.map(pascalCase).join('')
    const types = readVueTypes(await readFile(file, 'utf8'), file)
    components.set(name, types.props)
    components.set(`Lazy${name}`, types.props)
  }

  const used = new Set()
  const invalid = []
  const unresolved = []
  const record = (name, file, line) => {
    if (icons.has(name)) {
      used.add(name)
    } else {
      invalid.push({ file, line, name })
    }
  }

  for (const file of appFiles) {
    const source = await readFile(file, 'utf8')
    const descriptor = file.endsWith('.vue') ? parseVue(source, { filename: file }).descriptor : null
    const scriptBlocks = descriptor ? [descriptor.script, descriptor.scriptSetup].filter(Boolean) : []
    const script = descriptor ? scriptBlocks.map((block) => block.content).join('\n') : source
    const jsx = descriptor
      ? [descriptor.script, descriptor.scriptSetup].some((block) => /^[tj]sx$/.test(block?.attrs.lang))
      : /\.[jt]sx$/.test(file)
    let scriptAst = null
    if (script.trim()) {
      try {
        scriptAst = parseScript(script, file, jsx, scriptBlocks[0]?.loc.start.line - 1 || 0)
      } catch (error) {
        if (scriptBlocks.length > 1) {
          for (const block of scriptBlocks) {
            parseScript(block.content, file, /^[tj]sx$/.test(block.attrs.lang), block.loc.start.line - 1)
          }
        }
        throw error
      }
    }
    const bindings = new Map()
    const fileComponents = new Map(components)

    if (scriptAst) {
      for (const statement of scriptAst.program.body) {
        if (statement.type !== 'ImportDeclaration' || !statement.source.value.endsWith('.vue')) {
          continue
        }
        const importPath = statement.source.value.startsWith('~/')
          ? path.resolve(appDir, statement.source.value.slice(2))
          : path.resolve(path.dirname(file), statement.source.value)
        if (!existsSync(importPath)) {
          continue
        }
        const importedProps = readVueTypes(await readFile(importPath, 'utf8'), importPath).props
        for (const specifier of statement.specifiers) {
          fileComponents.set(specifier.local.name, importedProps)
        }
      }
      traverse(scriptAst, {
        VariableDeclarator({ node }) {
          if (node.id.type === 'Identifier' && node.init) {
            bindings.set(node.id.name, node.init)
          }
        },
      })
      traverse(scriptAst, {
        CallExpression({ node }) {
          if (node.callee.type === 'Identifier' && node.callee.name === 'parseIcon') {
            collectParseIcon(node, file, record, unresolved)
          }

          if (
            path.resolve(file) === uiConfigPath &&
            node.callee.type === 'Identifier' &&
            node.callee.name === 'defineBrickflowUi'
          ) {
            collectConfigIcons(node, configIconPaths, file, record, unresolved)
          }
        },
      })
    }

    if (descriptor?.template?.ast) {
      visitTemplate(descriptor.template.ast, (element) => {
        const propTypes = fileComponents.get(element.tag) || fileComponents.get(pascalCase(element.tag))

        if (!propTypes) {
          return
        }

        for (const prop of element.props) {
          let propName = null
          if (prop.type === 6) {
            propName = prop.name
          } else if (prop.arg?.isStatic) {
            propName = prop.arg.content
          }

          if (!propName || !propTypes.has(camelCase(propName))) {
            continue
          }

          const line = prop.loc.start.line

          if (prop.type === 6 && prop.value) {
            record(prop.value.content, file, line)
          } else if (prop.type === 7 && prop.exp) {
            try {
              const expression = parseExpression(prop.exp.content, { plugins: ['typescript'] })
              collectExpression(expression, bindings, file, line, record, unresolved)
            } catch {
              unresolved.push({ file, line, reason: prop.loc.source })
            }
          }
        }
      })
    }
  }

  const unused = [...icons].filter((name) => !used.has(name)).sort()
  console.log(
    `\n${paint('◆ Icon usage', '1;36')}  ${icons.size} total  ${paint(`${used.size} used`, '32')}  ${paint(`${unused.length} unused`, unused.length ? '33' : '32')}`,
  )
  if (unused.length) {
    console.log(`\n${paint(`Unused SVGs (${unused.length})`, '1')}`)
    const nameWidth = Math.max(...unused.map((name) => name.length))
    for (const name of unused) {
      console.log(
        `    ${paint(name, '1;33')}${' '.repeat(nameWidth - name.length + 4)}${fileLink(path.join(iconsDir, `${name}.svg`))}`,
      )
    }
  } else {
    console.log(`\n${paint('✓ No unused icons', '32')}`)
  }

  if (invalid.length) {
    console.error(`\n${paint(`✖ Unknown icons (${invalid.length})`, '1;31')}`)
    for (const item of invalid) {
      console.error(`  ${paint(item.name, '31')}  ${fileLink(item.file, item.line)}`)
    }
  }

  if (unresolved.length) {
    console.error(`\n${paint(`✖ Unresolved dynamic icons (${unresolved.length})`, '1;31')}`)
    for (const item of unresolved) {
      console.error(`  ${item.reason}  ${fileLink(item.file, item.line)}`)
    }
  }

  if (unused.length || invalid.length || unresolved.length) {
    process.exitCode = 1
  }
  console.log()
}

function visitTemplate(node, visit) {
  if (node.type === 1) {
    visit(node)
  }
  for (const child of node.children || []) {
    visitTemplate(child, visit)
  }
  if (node.branches) {
    for (const branch of node.branches) {
      visitTemplate(branch, visit)
    }
  }
}
