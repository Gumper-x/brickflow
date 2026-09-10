export interface GeneratedIconFiles {
  cssPath: string
  minifiedCssPath: string
}

export interface GenerateIconsOptions {
  inputDir: string
  name: string
  outputDir: string
}

export declare const getIconFontCssPath: (outputDir: string, name: string) => string

export declare function generateIcons(options: GenerateIconsOptions): Promise<GeneratedIconFiles>
