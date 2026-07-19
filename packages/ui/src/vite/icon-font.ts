import { FontAssetType, generateFonts, OtherAssetType } from 'fantasticon'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

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

const minifyCss = (css: string): string =>
  css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
    .replace(/;\}/g, '}')
    .trim()

const normalizeGeneratedCss = (css: string): string =>
  `${css
    .replace(/"/g, "'")
    .replace(/^ {4}/gm, '  ')
    .replace(/(\.(?:eot|ttf|woff2?))\?[^#'")]+(#iefix)?/gi, '$1$2')
    .replace(/src: ([^\n]+),\n([^\n]+),\n([^\n]+);/, 'src:\n    $1,\n    $2,\n    $3;')
    .replace(
      /i\[class\^='icon-'\]:before, i\[class\*=' icon-'\]:before \{/,
      "@layer base {\n  i[class^='icon-'],\n  i[class*=' icon-'] {\n    container-type: inline-size;\n    display: inline-flex;\n    width: 1em;\n  }\n}\n\ni[class^='icon-']:before,\ni[class*=' icon-']:before {\n  font-size: 100cqw;",
    )
    .replace(/\n{3,}/g, '\n\n')
    .trim()}\n`

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

export const getIconFontCssPath = (outputDir: string): string => join(outputDir, 'icon.minify.css')

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
  await mkdir(outputDir, { recursive: true })
  await generateFonts({
    assetTypes: [OtherAssetType.CSS],
    fontsUrl: '.',
    fontTypes: [FontAssetType.EOT, FontAssetType.WOFF2, FontAssetType.WOFF],
    inputDir,
    name: 'icon',
    normalize: true,
    outputDir,
  })

  const cssPath = join(outputDir, 'icon.css')
  const css = normalizeGeneratedCss(await readFile(cssPath, 'utf8'))

  await writeFile(cssPath, css)
  await writeFile(getIconFontCssPath(outputDir), minifyCss(css))
}

export const brickflowUiIconFontPlugin = (options: BrickflowUiIconFontOptions): VitePlugin => ({
  buildStart: () => generateIconFont(options),
  name: 'brickflow-ui-icons',
})
