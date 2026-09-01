export {}

declare module '#brickflow-ui-config' {
  import type { BrickflowUiConfig } from './tailwind'

  export const UI_CONFIG: BrickflowUiConfigType
  export const UI_STYLE: BrickflowUiStyleType
  export const uiConfig: BrickflowUiConfig['uiConfig']
  export const uiStyles: BrickflowUiConfig['uiStyles']

  const config: BrickflowUiConfig

  export default config
}

declare global {
  type BrickflowUiConfigFor<TExpected extends BrickflowUiConfigObject> = {
    [TKey in keyof BrickflowUiConfigLiteralPaths]: BrickflowUiConfigLiteralPaths[TKey] extends TExpected
      ? BrickflowUiConfigLiteralPaths[TKey]
      : never
  }[keyof BrickflowUiConfigLiteralPaths] extends infer TMatched
    ? [TMatched] extends [never]
      ? TExpected
      : TMatched
    : never

  interface BrickflowUiConfigLiteralPaths {}

  interface BrickflowUiConfigPaths {}

  type BrickflowUiConfigType = BrickflowUiConfigPaths & Record<string, unknown>

  interface BrickflowUiStylePaths {}

  type BrickflowUiStyleType = BrickflowUiStylePaths & BrickflowUiStyleValue

  type BrickflowUiStyleValue = string & {
    readonly [key: string]: BrickflowUiStyleValue
  }

  const UI_STYLE: BrickflowUiStyleType

  const UI_CONFIG: BrickflowUiConfigType

  function defineUiConfig<TConfig extends BrickflowUiConfigObject>(): BrickflowUiConfigFor<TConfig>
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    readonly UI_CONFIG: BrickflowUiConfigType
    readonly UI_STYLE: BrickflowUiStyleType
  }
}
