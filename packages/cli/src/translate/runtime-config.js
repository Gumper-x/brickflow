export const DEFAULT_CONTEXT_MODEL = 'gemini-3.1-flash-lite-preview'

let runtimeConfig = null

export function buildTranslateHelp(command = 'brick translate', { includeLocales = true } = {}) {
  const localesRequired = includeLocales ? '\n  --locales "en,pl,ru,de"' : ''
  const localesExample = includeLocales ? '    --locales "en,pl,ru,de" \\\n' : ''

  return `${command}

Required options:
  --product-context "<text>"
  --api-key "<key>"${localesRequired}

Optional:
  --context-model "<model>"  Default: ${DEFAULT_CONTEXT_MODEL}

Example:
  ${command} \\
    --product-context "Creators sell goods packs." \\
    --api-key "your-gemini-api-key" \\
${localesExample}    --context-model "${DEFAULT_CONTEXT_MODEL}"`
}

export function getTranslateRuntimeConfig() {
  if (!runtimeConfig) {
    throw new Error('Translate runtime config is not initialized. Pass --product-context and --api-key.')
  }

  return runtimeConfig
}

export function parseTranslateRuntimeArgs(rawArgs) {
  const options = {
    apiKey: null,
    contextModel: DEFAULT_CONTEXT_MODEL,
    locales: undefined,
    productContext: null,
  }
  const positional = []

  for (let index = 0; index < rawArgs.length; index += 1) {
    const value = rawArgs[index]

    if (value === '--product-context') {
      options.productContext = rawArgs[index + 1] ?? null
      index += 1
      continue
    }

    if (value === '--api-key') {
      options.apiKey = rawArgs[index + 1] ?? null
      index += 1
      continue
    }

    if (value === '--context-model') {
      options.contextModel = rawArgs[index + 1] ?? DEFAULT_CONTEXT_MODEL
      index += 1
      continue
    }

    if (value === '--locales') {
      options.locales = rawArgs[index + 1] ?? null
      index += 1
      continue
    }

    positional.push(value)
  }

  return {
    options,
    positional,
  }
}

export function setTranslateRuntimeConfig(config) {
  validateTranslateRuntimeConfig(config)
  runtimeConfig = {
    ...config,
    contextModel: config.contextModel || DEFAULT_CONTEXT_MODEL,
  }
}

export function validateTranslateRuntimeConfig(config) {
  const missing = []

  if (!config.productContext) {
    missing.push('--product-context')
  }

  if (!config.apiKey) {
    missing.push('--api-key')
  }

  if (missing.length > 0) {
    throw new Error(`Missing required translate options: ${missing.join(', ')}`)
  }
}
