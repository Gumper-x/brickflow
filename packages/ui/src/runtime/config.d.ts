export {}

declare module '#brickflow-ui-config' {
  import type { BrickflowUiConfig } from './tailwind'

  export const UI_STYLE: BrickflowUiConfig['uiStyles']
  export const uiStyles: BrickflowUiConfig['uiStyles']

  const config: BrickflowUiConfig

  export default config
}

declare global {
  interface BrickflowUiStylePaths {}

  type BrickflowUiStyleType = BrickflowUiStylePaths & BrickflowUiStyleValue

  type BrickflowUiStyleValue = string & {
    readonly [key: string]: BrickflowUiStyleValue
  }

  const UI_STYLE: BrickflowUiStyleType
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    readonly UI_STYLE: BrickflowUiStyleType
  }
}
