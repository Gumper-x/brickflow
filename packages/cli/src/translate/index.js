import fs from 'fs'
import { dirname, join, relative } from 'path'

import { resolveWorkspaceRoot } from '../shared/workspace-root.js'
import { getContextFilePath, readAiContextDescription } from '../translate-context/ai-context.js'
import { translateBatch } from './ai.js'
import { buildTranslateHelp, parseTranslateRuntimeArgs, setTranslateRuntimeConfig } from './runtime-config.js'
import { listTranslationTargets, sortObjectKeys, stringifySortedJson } from './utils.js'

const workspaceRoot = resolveWorkspaceRoot()
const rawArgs = process.argv.slice(3)

if (rawArgs.includes('--help') || rawArgs.includes('-h')) {
  console.log(buildTranslateHelp())
  process.exit(0)
}

const { options } = parseTranslateRuntimeArgs(rawArgs)
let requestedLanguageCodes

try {
  setTranslateRuntimeConfig(options)
  requestedLanguageCodes = parseLanguageCodes(options.locales)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  console.error('')
  console.error(buildTranslateHelp())
  process.exit(1)
}

const BATCH_MAX_ITEMS = readPositiveInt('TRANSLATE_BATCH_MAX_ITEMS', 30)
const BATCH_MAX_CHARS = readPositiveInt('TRANSLATE_BATCH_MAX_CHARS', 3500)
const languageCodes = requestedLanguageCodes

const tasks = listTranslationTargets(workspaceRoot).map(({ samplePath, sourceFilePath }) => ({
  sample: readJson(samplePath),
  samplePath,
  sourceFilePath,
}))

const total = tasks.reduce((count, task) => count + Object.keys(task.sample).length * languageCodes.length, 0)
const progress = createProgress(total)

if (tasks.length === 0) {
  console.log('✅ No translation sample folders found')
  process.exit(0)
}

for (const task of tasks) {
  await processSample(task)
}

process.stdout.write('\n')
console.log(
  `✅ Done: ${tasks.length} sample folders, ${languageCodes.length} languages, batch=${BATCH_MAX_ITEMS}/${BATCH_MAX_CHARS}`,
)

function createProgress(totalCount) {
  let done = 0
  let lastRenderedAt = 0
  const start = Date.now()

  return function update(languageCode, samplePath) {
    done += 1

    const now = Date.now()
    if (done !== totalCount && now - lastRenderedAt < 80) {
      return
    }

    lastRenderedAt = now

    const percent = totalCount === 0 ? 100 : Math.round((done * 100) / totalCount)
    const filled = Math.round(percent / 5)
    const empty = 20 - filled
    const elapsed = ((now - start) / 1000).toFixed(1)
    const shortName = shortenPath(relative(workspaceRoot, samplePath))

    process.stdout.write(
      `\r🌍 Translation: [${'█'.repeat(filled)}${' '.repeat(empty)}] ` +
        `${percent}% (${done}/${totalCount}) ` +
        `⏱ ${elapsed}s ` +
        `\x1b[90m${languageCode} ${shortName}\x1b[0m\x1b[K`,
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

function estimateEntryChars(entry) {
  return String(entry.key).length + String(entry.text).length + String(entry.filePath ?? '').length + 32
}

function existsJson(filePath) {
  return fs.existsSync(filePath)
}

function normalizeEol(content) {
  return String(content).replace(/\r\n/g, '\n')
}

function parseLanguageCodes(value) {
  if (value === undefined || value === null) {
    throw new Error('Missing required translate option: --locales')
  }

  const localeCodes = [
    ...new Set(
      String(value)
        .split(/[\s,]+/)
        .filter(Boolean),
    ),
  ].map((code) => code.toLowerCase())

  if (localeCodes.length === 0 || localeCodes.some((code) => !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(code))) {
    throw new Error(
      'Invalid --locales value. Use comma-separated locale codes, for example: --locales en,pl,ru,de',
    )
  }

  if (!localeCodes.includes('en')) {
    throw new Error('Missing required locale: en. Add it to --locales, for example: --locales en,pl,ru,de')
  }

  return localeCodes.sort()
}

async function processSample({ sample, samplePath }) {
  const componentContext = readAiContextDescription(samplePath)

  if (!componentContext) {
    throw new Error(
      `Missing AI context: ${relative(workspaceRoot, getContextFilePath(samplePath))}. Run "brick translate-context" first.`,
    )
  }

  writeSortedJsonIfNeeded(samplePath, sample)

  const dataPath = join(dirname(samplePath), 'data.json')
  const currentData = existsJson(dataPath) ? readJson(dataPath) : {}
  const currentEn = currentData.en ?? {}
  const currentByLanguage = new Map(
    languageCodes.map((languageCode) => [languageCode, currentData[languageCode] ?? {}]),
  )
  const resultByLanguage = new Map(languageCodes.map((languageCode) => [languageCode, {}]))
  const pendingEntriesByLocales = new Map()

  for (const [key, sampleValue] of Object.entries(sample)) {
    const missingLocales = []

    for (const languageCode of languageCodes) {
      const languageResult = resultByLanguage.get(languageCode)

      if (!languageResult) {
        continue
      }

      if (languageCode === 'en' || typeof sampleValue !== 'string') {
        languageResult[key] = sampleValue
        progress(languageCode, samplePath)
        continue
      }

      const currentLang = currentByLanguage.get(languageCode) ?? {}

      if (typeof currentLang[key] === 'string' && currentEn[key] === sampleValue) {
        languageResult[key] = currentLang[key]
        progress(languageCode, samplePath)
        continue
      }

      missingLocales.push(languageCode)
    }

    if (typeof sampleValue === 'string' && missingLocales.length > 0) {
      const localeKey = missingLocales.join(',')
      const entries = pendingEntriesByLocales.get(localeKey) ?? []

      entries.push({
        filePath: relative(workspaceRoot, samplePath),
        key,
        text: sampleValue,
      })

      pendingEntriesByLocales.set(localeKey, entries)
    }
  }

  for (const [localeKey, entries] of pendingEntriesByLocales) {
    const targetLocales = localeKey.split(',').filter(Boolean)
    const chunks = splitIntoBatches(entries, BATCH_MAX_ITEMS, BATCH_MAX_CHARS)

    for (const chunk of chunks) {
      const translations = await translateChunk(chunk, samplePath, targetLocales, componentContext)

      for (const languageCode of targetLocales) {
        const languageResult = resultByLanguage.get(languageCode)
        const localizedValues = translations[languageCode]

        if (!languageResult || !localizedValues) {
          throw new Error(
            `Missing locale "${languageCode}" in AI response for ${relative(workspaceRoot, samplePath)}`,
          )
        }

        for (const entry of chunk) {
          const translatedValue = localizedValues[entry.key]

          if (typeof translatedValue !== 'string' || translatedValue.length === 0) {
            throw new Error(
              `Missing translation for ${languageCode} ${relative(workspaceRoot, samplePath)} :: ${entry.key}`,
            )
          }

          languageResult[entry.key] = translatedValue
          progress(languageCode, samplePath)
        }
      }
    }
  }

  const nextData = {}

  for (const languageCode of languageCodes) {
    nextData[languageCode] = sortObjectKeys(resultByLanguage.get(languageCode) ?? {})
  }

  writeTextPreservingEol(dataPath, stringifySortedJson(nextData))
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

function readPositiveInt(name, fallback) {
  const raw = process.env[name]

  if (!raw) {
    return fallback
  }

  const value = Number.parseInt(raw, 10)
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function shortenPath(filePath, maxLength = 72) {
  if (filePath.length <= maxLength) {
    return filePath
  }

  return `...${filePath.slice(-(maxLength - 3))}`
}

function splitIntoBatches(entries, maxItems, maxChars) {
  const batches = []
  let current = []
  let currentChars = 0

  for (const entry of entries) {
    const entryChars = estimateEntryChars(entry)
    const shouldFlush = current.length > 0 && (current.length >= maxItems || currentChars + entryChars > maxChars)

    if (shouldFlush) {
      batches.push(current)
      current = []
      currentChars = 0
    }

    current.push(entry)
    currentChars += entryChars
  }

  if (current.length > 0) {
    batches.push(current)
  }

  return batches
}

async function translateChunk(entries, samplePath, targetLocales, componentContext) {
  try {
    return await translateBatch(entries, {
      componentContext,
      sourceLocale: 'en',
      targetLocales,
    })
  } catch (error) {
    throw new Error(
      `Translation failed for ${relative(workspaceRoot, samplePath)} (${entries.length} strings, ${targetLocales.join(', ')})`,
      { cause: error },
    )
  }
}

function writeSortedJsonIfNeeded(filePath, value) {
  const nextText = stringifySortedJson(value)
  const prevText = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null

  if (prevText === null || normalizeEol(prevText) !== normalizeEol(nextText)) {
    writeTextPreservingEol(filePath, nextText)
  }
}

function writeTextPreservingEol(filePath, content) {
  const eol = detectEol(filePath)
  const normalized = String(content).replace(/\r?\n/g, eol)
  fs.writeFileSync(filePath, normalized, 'utf-8')
}
