declare module '#brickflow-ui-config' {
  export const UI_CONFIG: BrickflowUiConfigType
  export const UI_STYLE: BrickflowUiStyleType
  export const uiConfig: BrickflowUiConfigLiteralPaths
  export const uiStyles: BrickflowUiStyleType

  const config: { uiConfig: typeof uiConfig; uiStyles: typeof uiStyles }

  export default config
}
