import { generateIcons, getIconFontCssPath as getGeneratedIconFontCssPath } from '@brickflow/cli/icon'
import { readdir } from 'node:fs/promises'

export interface BrickflowUiIconFontOptions {
  inputDir: string
  outputDir: string
}

export type ViteAssetsInlineLimit = ((filePath: string, content: Buffer) => boolean | undefined) | number

type VitePlugin = {
  buildStart: () => Promise<void>
  name: string
}

const ICON_FILE_PATTERN = /\.svg$/i
const ICON_FONT_NAME = 'brickflow-icon'

export const getIconFontNames = async (inputDir: string): Promise<string[]> => {
  const entries = await readdir(inputDir, { withFileTypes: true })
  const invalidEntries = entries.filter((entry) => !entry.isFile() || !ICON_FILE_PATTERN.test(entry.name))

  if (invalidEntries.length > 0) {
    throw new Error(
      `brickflowUi.iconsPath must be a flat directory containing only .svg files. Invalid entries: ${invalidEntries
        .map((entry) => entry.name)
        .join(', ')}`,
    )
  }

  if (entries.length === 0) {
    throw new Error('brickflowUi.iconsPath must contain at least one .svg file')
  }

  return entries.map((entry) => entry.name.replace(ICON_FILE_PATTERN, '')).sort((a, b) => a.localeCompare(b))
}

export const getIconFontCssPath = (outputDir: string): string =>
  getGeneratedIconFontCssPath(outputDir, ICON_FONT_NAME)

export const createIconFontAssetsInlineLimit = (
  outputDir: string,
  currentLimit: undefined | ViteAssetsInlineLimit,
): ((filePath: string, content: Buffer) => boolean | undefined) => {
  const normalizedOutputDir = outputDir.replaceAll('\\', '/')

  return (filePath, content) => {
    if (filePath.replaceAll('\\', '/').startsWith(`${normalizedOutputDir}/`)) {
      return false
    }

    if (typeof currentLimit === 'function') {
      return currentLimit(filePath, content)
    }

    return typeof currentLimit === 'number' ? content.length < currentLimit : undefined
  }
}

export const generateIconFont = async ({ inputDir, outputDir }: BrickflowUiIconFontOptions): Promise<void> => {
  await getIconFontNames(inputDir)
  await generateIcons({
    inputDir,
    name: ICON_FONT_NAME,
    outputDir,
  })
}

export const brickflowUiIconFontPlugin = (options: BrickflowUiIconFontOptions): VitePlugin => ({
  buildStart: () => generateIconFont(options),
  name: 'brickflow-ui-icons',
})
