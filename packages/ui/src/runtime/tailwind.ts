export interface BrickflowUiConfig<TStyles = BrickflowUiStyles> {
  uiStyles: TStyles
}

declare global {
  interface BrickflowUiConfigStylePaths {}

  type BrickflowUiStyleObject = {
    readonly [key: string]: BrickflowUiStyleObject | string
  }
}

export interface BrickflowUiConfigContext {
  value<const TValue extends string>(value: TValue): TValue
}

export type BrickflowUiConfigInput<TStyles extends BrickflowUiStyleObject = BrickflowUiStyles> = {
  readonly uiStyles?: TStyles
}

export type BrickflowUiNoExtraKeys<TValue, TShape> = TValue extends string
  ? TShape extends string
    ? TValue
    : never
  : TShape extends string
    ? never
    : {
        readonly [K in keyof TValue]: K extends keyof TShape ? BrickflowUiNoExtraKeys<TValue[K], TShape[K]> : never
      }

export type BrickflowUiStrictStyles<TStyles extends BrickflowUiConfigStylePaths> = BrickflowUiNoExtraKeys<
  TStyles,
  BrickflowUiConfigStylePaths
> &
  TStyles

export type BrickflowUiStyles = BrickflowUiStyleObject

export const emptyUiStyles = {} as const satisfies BrickflowUiStyleObject

export const emptyBrickflowUiConfig: BrickflowUiConfig<typeof emptyUiStyles> = {
  uiStyles: emptyUiStyles,
}

export function defineBrickflowUiConfig(): BrickflowUiConfig<typeof emptyUiStyles>
export function defineBrickflowUiConfig<const TStyles extends BrickflowUiConfigStylePaths>(
  configOrFactory:
    | ((context: BrickflowUiConfigContext) => BrickflowUiConfigInput<BrickflowUiStrictStyles<TStyles>>)
    | BrickflowUiConfigInput<BrickflowUiStrictStyles<TStyles>>,
): BrickflowUiConfig<TStyles>
export function defineBrickflowUiConfig(
  configOrFactory:
    | ((context: BrickflowUiConfigContext) => BrickflowUiConfigInput<BrickflowUiStyleObject>)
    | BrickflowUiConfigInput<BrickflowUiStyleObject> = {},
): BrickflowUiConfig {
  const config =
    typeof configOrFactory === 'function' ? configOrFactory({ value: (value) => value }) : configOrFactory
  const uiStyles = config.uiStyles ?? emptyUiStyles

  validateUiStyles(uiStyles)

  return {
    uiStyles,
  }
}

export const uiStyles = emptyBrickflowUiConfig.uiStyles

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function validateUiStyles(value: unknown, path = 'uiStyles'): asserts value is BrickflowUiStyles {
  if (!isRecord(value)) {
    throw new TypeError(`${path} must be an object.`)
  }

  for (const [key, childValue] of Object.entries(value)) {
    const childPath = `${path}.${key}`

    if (typeof childValue === 'string') {
      continue
    }

    if (isRecord(childValue)) {
      validateUiStyles(childValue, childPath)
      continue
    }

    throw new TypeError(`${childPath} must be a string or an object.`)
  }
}

export default emptyBrickflowUiConfig
