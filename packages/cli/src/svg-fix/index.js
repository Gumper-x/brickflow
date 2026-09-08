import { readdir, readFile, realpath, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'

try {
  await main()
} catch (error) {
  console.error(`SVG fix failed: ${error.message}`)
  process.exitCode = 1
}

async function collectSvgFiles(input, files, visited) {
  if (visited.has(input)) {
    return
  }

  visited.add(input)
  const inputStat = await stat(input)

  if (inputStat.isFile() && path.extname(input).toLowerCase() === '.svg') {
    files.add(input)
    return
  }

  if (!inputStat.isDirectory()) {
    return
  }

  const entries = await readdir(input, { withFileTypes: true })

  for (const entry of entries.sort((first, second) => first.name.localeCompare(second.name))) {
    const entryPath = path.join(input, entry.name)

    if (entry.isDirectory()) {
      await collectSvgFiles(entryPath, files, visited)
    } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.svg') {
      files.add(entryPath)
    }
  }
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args: process.argv.slice(3),
    options: {
      help: { short: 'h', type: 'boolean' },
      path: { multiple: true, short: 'p', type: 'string' },
      verbose: { short: 'v', type: 'boolean' },
    },
  })

  if (values.help) {
    printHelp()
    return
  }

  const inputs = [...positionals, ...(values.path ?? [])]

  if (inputs.length === 0 || inputs.some((input) => input.length === 0)) {
    printHelp()
    throw new Error('Provide at least one path to a directory or SVG file.')
  }

  const files = new Set()
  const visited = new Set()

  for (const input of inputs) {
    await collectSvgFiles(await realpath(path.resolve(input)), files, visited)
  }

  const svgFiles = [...files]

  if (svgFiles.length === 0) {
    console.log('No SVG files found in the supplied paths')
    return
  }

  const { convertSvg } = await import('./convert.js')
  let changed = 0
  let failed = 0

  console.log(`Fixing ${svgFiles.length} SVG file(s) in place`)

  for (const [index, source] of svgFiles.entries()) {
    const relativePath = path.relative(process.cwd(), source)

    try {
      const original = await readFile(source, 'utf8')
      const diagnostics = []
      const fixed = convertSvg(original, {
        onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
      })
      for (const diagnostic of diagnostics) {
        if (diagnostic.level === 'warning' || values.verbose) {
          console.warn(`  ${diagnostic.level}: ${diagnostic.code}: ${diagnostic.message}`)
        }
      }
      if (fixed === original) {
        console.log(`[${index + 1}/${svgFiles.length}] unchanged: ${relativePath}`)
        continue
      }
      await writeFile(source, fixed)
      changed += 1
    } catch (error) {
      failed += 1
      console.error(`[${index + 1}/${svgFiles.length}] failed: ${relativePath}: ${error.message}`)
      continue
    }

    console.log(`[${index + 1}/${svgFiles.length}] ${relativePath}`)
  }

  console.log(
    `Fixed ${changed} SVG file(s); unchanged ${svgFiles.length - changed - failed}${failed ? `; failed ${failed}` : ''}`,
  )
  if (failed > 0) {
    process.exitCode = 1
  }
}

function printHelp() {
  console.log(`brick svg-fix <path...>

Usage:
  brick svg-fix ./icons/logo.svg
  brick svg-fix ./icons
  brick svg-fix ./icons ./assets/icons ./logo.svg
  brick svg-fix --path ./icons --path ./assets/icons

Options:
  -p, --path   Directory or SVG file; may be repeated
  -v, --verbose  Also print applied auto-fixes
  -h, --help   Show this help

Notes:
  Converts only elements with a visible stroke into filled outline paths
  Paths are resolved from the current working directory
  SVG files are overwritten in place; no output directory is needed
  Each SVG is processed once, even when supplied paths overlap
  Fill-only elements, groups, defs, metadata, viewBox and transforms are preserved
  SVG files without visible strokes are left byte-for-byte unchanged
  Run brick svg first and brick svg-fix last
  Exits with code 1 if any file fails
  Other files and symbolic links discovered inside directories are skipped`)
}
