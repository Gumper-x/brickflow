export {}

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
