import fs from 'fs'
import { globSync } from 'glob'
import path from 'path'

import {
  compileVueToJS,
  extractStrings,
  getTranslationPaths,
  listWorkspaceFiles,
  sortObjectKeys,
  stringifySortedJson,
} from '../translate/utils.js'

const WORKSPACE_MARKERS = ['.git', 'pnpm-workspace.yaml', 'lerna.json', 'turbo.json']

const args = process.argv.slice(3)

if (args.includes('--help') || args.includes('-h')) {
  printHelp()
  process.exit(0)
}

if (args.length > 0) {
  printHelp()
  process.exit(1)
}

const workspaceRoot = resolveWorkspaceRoot()
const activeGeneratedDirs = new Set()
const cleanupRoots = new Set()
const staticCleanupRoots = [
  path.resolve(workspaceRoot, 'packages/brick/global'),
  ...globSync('apps/*/global', {
    absolute: true,
    cwd: workspaceRoot,
  }),
]

const files = listWorkspaceFiles(workspaceRoot).filter(
  (file) => /\.(?:js|ts|vue)$/.test(file) && !file.endsWith('.d.ts'),
)
const filtered = files.filter((file) => getTranslationPaths(file))

for (const rootDir of staticCleanupRoots) {
  cleanupRoots.add(rootDir)
}

const progress = createProgress(filtered.length)

for (const file of filtered) {
  processFile(file)
  progress(file)
}

cleanupGeneratedDirs()

process.stdout.write('\n')
console.log('✅ Done')

function cleanupGeneratedDirs() {
  for (const rootDir of cleanupRoots) {
    if (!fs.existsSync(rootDir)) {
      continue
    }

    for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue
      }

      const targetDir = path.resolve(rootDir, entry.name)

      if (!activeGeneratedDirs.has(targetDir)) {
        removeDir(targetDir)
      }
    }
  }
}

function createProgress(total) {
  let done = 0
  const start = Date.now()

  return function update(currentFile) {
    done += 1

    const percent = total === 0 ? 100 : Math.round((done * 100) / total)
    const filled = Math.round(percent / 5)
    const empty = 20 - filled

    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    const shortName = currentFile.split('/').slice(-3).join('/')

    process.stdout.write(
      `\r⚙️  Processing: [${'█'.repeat(filled)}${' '.repeat(empty)}] ` +
        `${percent}% (${done}/${total}) ` +
        `⏱ ${elapsed}s ` +
        `\x1b[90m${shortName}\x1b[0m\x1b[K`,
    )
  }
}

function detectEol(filePath) {
  if (!fs.existsSync(filePath)) {
    return '\n'
  }

  const text = fs.readFileSync(filePath, 'utf-8')
  return text.includes('\r\n') ? '\r\n' : '\n'
}

function ensureSortedJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return false
  }

  const currentText = fs.readFileSync(filePath, 'utf-8')
  const parsed = JSON.parse(currentText)
  const sortedText = stringifySortedJson(parsed)

  if (normalizeJsonEol(currentText) === normalizeJsonEol(sortedText)) {
    return false
  }

  writeTextPreservingEol(filePath, sortedText)
  return true
}

function ensureSortedTranslationJsons(baseDir, samplePath) {
  const filesToCheck = [samplePath, path.resolve(baseDir, 'ai-context.json')]
  const generatedDir = path.resolve(baseDir, 'generated')

  if (fs.existsSync(generatedDir)) {
    for (const entry of fs.readdirSync(generatedDir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.json')) {
        filesToCheck.push(path.resolve(generatedDir, entry.name))
      }
    }
  }

  for (const filePath of filesToCheck) {
    try {
      if (ensureSortedJsonFile(filePath)) {
        console.log('\n🔤 Sorted keys:', filePath)
      }
    } catch (error) {
      console.error('\n❌ invalid translation json:', filePath, error)
    }
  }
}

function hasAnyFile(directoryPath, fileNames) {
  return fileNames.some((fileName) => fs.existsSync(path.join(directoryPath, fileName)))
}

function normalizeJsonEol(content) {
  return String(content).replace(/\r\n/g, '\n')
}

function printHelp() {
  console.log(`brick translate-sync

Usage:
  brick translate-sync

Notes:
  Scans source files and regenerates translation sample.json files
  Removes obsolete generated translation directories
  Verifies and normalizes translation JSON key ordering`)
}

function processFile(filePath) {
  let code = fs.readFileSync(filePath, 'utf-8')

  try {
    if (filePath.endsWith('.vue')) {
      code = compileVueToJS(code, filePath)
    }

    const strings = extractStrings(code, filePath)

    writeTranslations(filePath, strings)
  } catch (error) {
    console.error('\n❌ error:', filePath, error)
  }
}

function removeDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { force: true, recursive: true })
  }
}

function resolveWorkspaceRoot(startDir = process.cwd()) {
  let currentDir = path.resolve(startDir)
  let packageRoot = null

  while (true) {
    if (hasAnyFile(currentDir, WORKSPACE_MARKERS)) {
      return currentDir
    }

    if (fs.existsSync(path.join(currentDir, 'package.json'))) {
      packageRoot = currentDir
    }

    const parentDir = path.dirname(currentDir)

    if (parentDir === currentDir) {
      return packageRoot || startDir
    }

    currentDir = parentDir
  }
}

function writeTextPreservingEol(filePath, content) {
  const eol = detectEol(filePath)
  const normalized = String(content).replace(/\r?\n/g, eol)
  fs.writeFileSync(filePath, normalized, 'utf-8')
}

function writeTranslations(id, strings) {
  const paths = getTranslationPaths(id)

  if (!paths) {
    return
  }

  const { baseDir, isComponent, isLayout, isPage, isScript, samplePath } = paths

  if (isPage || isLayout || isScript) {
    cleanupRoots.add(path.dirname(baseDir))
  }

  if (strings.size === 0) {
    if (isComponent || isPage || isLayout || isScript) {
      removeDir(baseDir)
    }
    return
  }

  if (isPage || isLayout || isScript) {
    activeGeneratedDirs.add(baseDir)
  }

  fs.mkdirSync(baseDir, { recursive: true })

  let prev = {}

  if (fs.existsSync(samplePath)) {
    try {
      prev = JSON.parse(fs.readFileSync(samplePath, 'utf-8'))
    } catch {
      prev = {}
    }
  }

  const next = {}

  for (const [key, value] of strings) {
    next[key] = value
  }

  const sortedNext = sortObjectKeys(next)
  const isSame =
    Object.keys(prev).length === Object.keys(sortedNext).length &&
    Object.keys(prev).every((key) => prev[key] === sortedNext[key])

  if (!isSame) {
    writeTextPreservingEol(samplePath, stringifySortedJson(sortedNext))
    console.log('\n🧪 Updated:', samplePath)
  }

  ensureSortedTranslationJsons(baseDir, samplePath)
}
