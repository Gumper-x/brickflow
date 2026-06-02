import { readdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(3)

if (args.includes('--help') || args.includes('-h')) {
  printHelp()
  process.exit(0)
}

const options = parseArgs(args)

if (options.paths.length === 0 || !options.typeName || !options.outputFile || !options.replacePattern) {
  printHelp()
  process.exit(1)
}

const inputDirs = options.paths.map((inputPath) => path.resolve(process.cwd(), inputPath))
const outputFile = path.resolve(process.cwd(), options.outputFile)
const replacePattern = parseReplacePattern(options.replacePattern)
const entries = inputDirs
  .flatMap((inputDir) =>
    readdirSync(inputDir)
      .filter((entry) => statSync(path.join(inputDir, entry)).isFile())
      .map((entry) => ({ entry, inputDir }))
  )
  .sort((first, second) => {
    const entryComparison = first.entry.localeCompare(second.entry)

    if (entryComparison !== 0) {
      return entryComparison
    }

    return first.inputDir.localeCompare(second.inputDir)
  })

const typeValues = new Set(entries.map(({ entry }) => applyReplacePattern(entry, replacePattern)).filter(Boolean))

if (typeValues.size === 0) {
  throw new Error(`No type values generated from: ${inputDirs.join(', ')}`)
}

const declaration = `declare type ${options.typeName} = ${[...typeValues].map((value) => `'${value}'`).join(' | ')}\n`
writeFileSync(outputFile, declaration, 'utf8')

console.log(`✅ Types generated for ${options.typeName}`)
console.log(`   input:  ${inputDirs.join(', ')}`)
console.log(`   output: ${outputFile}`)

function applyReplacePattern(value, pattern) {
  if (pattern instanceof RegExp) {
    return value.replace(pattern, '')
  }

  return value.replaceAll(pattern, '')
}

function parseArgs(rawArgs) {
  const parsedOptions = {
    outputFile: null,
    paths: [],
    replacePattern: null,
    typeName: null,
  }
  const positional = []

  for (let index = 0; index < rawArgs.length; index += 1) {
    const value = rawArgs[index]

    if (value === '--path') {
      const inputPath = rawArgs[index + 1] ?? null

      if (inputPath) {
        parsedOptions.paths.push(inputPath)
      }

      index += 1
      continue
    }

    if (value === '--type-name') {
      parsedOptions.typeName = rawArgs[index + 1] ?? null
      index += 1
      continue
    }

    if (value === '--output-file') {
      parsedOptions.outputFile = rawArgs[index + 1] ?? null
      index += 1
      continue
    }

    if (value === '--replace-pattern') {
      parsedOptions.replacePattern = rawArgs[index + 1] ?? null
      index += 1
      continue
    }

    positional.push(value)
  }

  if (parsedOptions.paths.length === 0 && positional[0]) {
    parsedOptions.paths.push(positional[0])
  }

  if (!parsedOptions.typeName) {
    parsedOptions.typeName = positional[1] ?? null
  }

  if (!parsedOptions.outputFile) {
    parsedOptions.outputFile = positional[2] ?? null
  }

  if (!parsedOptions.replacePattern) {
    parsedOptions.replacePattern = positional[3] ?? null
  }

  return parsedOptions
}

function parseReplacePattern(value) {
  const match = value.match(/^\/([\s\S]*)\/([dgimsuvy]*)$/)

  if (match) {
    return new RegExp(match[1], match[2])
  }

  return value
}

function printHelp() {
  console.log(`brick types <path> <typeName> <outputFile> <replacePattern>

Usage:
  brick types ./path/to/files IconName ./types/icon.d.ts .svg
  brick types ./path/to/files IconName ./types/icon.d.ts /\\.svg$/
  brick types --path ./path/to/files --type-name IconName --output-file ./types/icon.d.ts --replace-pattern /\\.svg$/
  brick types --path ./path/to/files --path ./path/to/more-files --type-name IconName --output-file ./types/icon.d.ts --replace-pattern /\\.svg$/

Notes:
  path: directory with source files, can be passed multiple times
  typeName: generated TypeScript type name
  outputFile: file to write declaration into
  replacePattern: string or regex literal used in replace(..., '') for each filename`)
}
