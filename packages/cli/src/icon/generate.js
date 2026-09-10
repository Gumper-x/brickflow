import { FontAssetType, generateFonts, OtherAssetType } from 'fantasticon'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, parse } from 'node:path'

export const getIconFontCssPath = (outputDir, name) => join(outputDir, `${name}.minify.css`)

export async function generateIcons({ inputDir, name, outputDir }) {
  await mkdir(outputDir, { recursive: true })
  await generateFonts({
    assetTypes: [OtherAssetType.CSS, OtherAssetType.JSON],
    fontsUrl: '.',
    fontTypes: [FontAssetType.EOT, FontAssetType.WOFF2, FontAssetType.WOFF],
    formatOptions: {
      json: {
        indent: 2,
      },
    },
    inputDir,
    name,
    normalize: true,
    outputDir,
  })

  let cssSourceFile

  for (const file of [`${name}.css`, 'icons.css', 'icon.css']) {
    try {
      await access(join(outputDir, file))
      cssSourceFile = file
      break
    } catch {
      // Try the next filename supported by fantasticon.
    }
  }

  if (!cssSourceFile) {
    throw new Error(`CSS output file was not generated for icon set "${name}"`)
  }

  const cssPath = join(outputDir, cssSourceFile)
  const minifiedCssPath = join(outputDir, `${parse(cssSourceFile).name}.minify.css`)
  const cssContent = await readFile(cssPath, 'utf8')
  const normalizedCssContent = normalizeGeneratedCss(cssContent)

  if (normalizedCssContent !== cssContent) {
    await writeFile(cssPath, normalizedCssContent)
  }

  await writeFile(minifiedCssPath, minifyCss(normalizedCssContent))

  return {
    cssPath,
    minifiedCssPath,
  }
}

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>+~])\s*/g, '$1')
    .replace(/;\}/g, '}')
    .trim()
}

function normalizeGeneratedCss(css) {
  return `${css
    .replace(/"/g, "'")
    .replace(/^ {4}/gm, '  ')
    .replace(/src: ([^\n]+),\n([^\n]+),\n([^\n]+);/, 'src:\n    $1,\n    $2,\n    $3;')
    .replace(
      /i\[class\^='icon-'\]:before, i\[class\*=' icon-'\]:before \{/,
      "i[class^='icon-']:before,\ni[class*=' icon-']:before {",
    )
    .replace(/\n{3,}/g, '\n\n')
    .trim()}\n`
}
