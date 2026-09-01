const UI_STYLE_REFERENCE: unique symbol = Symbol.for('@brickflow/ui/style-reference') as never

export interface BrickflowUiConfig<TStyles = BrickflowUiStyles, TConfig = BrickflowUiConfigObject> {
  uiConfig: TConfig
  uiStyles: TStyles
}

export type BrickflowUiConfigObject = {
  readonly [key: string]: BrickflowUiConfigValue
}

export type BrickflowUiConfigValue = BrickflowUiConfigObject | BrickflowUiStyleReference | string

export interface BrickflowUiStyleReference {
  readonly [UI_STYLE_REFERENCE]: readonly string[]
}

declare global {
  interface BrickflowUiConfigSchema {}

  interface BrickflowUiConfigStylePaths {}

  type BrickflowUiStyleObject = {
    readonly [key: string]: BrickflowUiStyleObject | string
  }
}

export type BrickflowUiConfigInput<
  TStyles extends BrickflowUiStyleObject = BrickflowUiStyles,
  TConfig extends BrickflowUiConfigObject = BrickflowUiConfigObject,
> = BrickflowUiConfigInputConfig<TConfig> & {
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

type BrickflowUiConfigContext = keyof BrickflowUiConfigSchema extends never
  ? unknown
  : { readonly uiConfig: BrickflowUiConfigSchema }

type BrickflowUiConfigInputConfig<TConfig extends BrickflowUiConfigObject> =
  keyof BrickflowUiConfigSchema extends never ? { readonly uiConfig?: TConfig } : { readonly uiConfig: TConfig }

type BrickflowUiConfigValidation<TConfig extends BrickflowUiConfigObject> =
  keyof BrickflowUiConfigSchema extends never
    ? unknown
    : TConfig extends BrickflowUiConfigSchema
      ? unknown
      : { readonly __brickflowUiConfigError: 'uiConfig does not satisfy a component config schema' }

export const emptyUiStyles = {} as const satisfies BrickflowUiStyleObject
export const emptyUiConfig = {} as const satisfies BrickflowUiConfigObject

export const emptyBrickflowUiConfig: BrickflowUiConfig<typeof emptyUiStyles, typeof emptyUiConfig> = {
  uiConfig: emptyUiConfig,
  uiStyles: emptyUiStyles,
}

export function defineBrickflowUiConfig(): BrickflowUiConfig<typeof emptyUiStyles, typeof emptyUiConfig>
export function defineBrickflowUiConfig<
  const TStyles extends BrickflowUiConfigStylePaths,
  const TConfig extends BrickflowUiConfigObject,
>(
  config: BrickflowUiConfigContext &
    BrickflowUiConfigInput<BrickflowUiStrictStyles<TStyles>, TConfig> &
    BrickflowUiConfigValidation<TConfig>,
): BrickflowUiConfig<TStyles, TConfig>
export function defineBrickflowUiConfig(
  config: BrickflowUiConfigInput<BrickflowUiStyleObject, BrickflowUiConfigObject> = {} as BrickflowUiConfigInput<
    BrickflowUiStyleObject,
    BrickflowUiConfigObject
  >,
): BrickflowUiConfig {
  const uiConfig = config.uiConfig ?? emptyUiConfig
  const uiStyles = config.uiStyles ?? emptyUiStyles

  validateUiConfig(uiConfig)
  validateUiStyles(uiStyles)

  return {
    uiConfig,
    uiStyles,
  }
}

export const uiStyles = emptyBrickflowUiConfig.uiStyles
export const uiConfig = emptyBrickflowUiConfig.uiConfig

const createUiStyleReference = (path: readonly string[] = []): BrickflowUiStyleReference =>
  new Proxy(
    { [UI_STYLE_REFERENCE]: path },
    {
      get(target, key) {
        if (key === UI_STYLE_REFERENCE) {
          return target[UI_STYLE_REFERENCE]
        }

        return typeof key === 'string' ? createUiStyleReference([...path, key]) : undefined
      },
    },
  ) as BrickflowUiStyleReference

/** A compile-time reference to a value in `uiStyles`, for use inside `uiConfig`. */
export const UI_STYLE = createUiStyleReference()

export const isBrickflowUiStyleReference = (value: unknown): value is BrickflowUiStyleReference =>
  Boolean(value && typeof value === 'object' && UI_STYLE_REFERENCE in value)

export const getBrickflowUiStyleReferencePath = (value: BrickflowUiStyleReference): readonly string[] =>
  value[UI_STYLE_REFERENCE]

if (!('UI_STYLE' in globalThis)) {
  Object.defineProperty(globalThis, 'UI_STYLE', {
    configurable: true,
    value: UI_STYLE,
  })
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function validateUiConfig(value: unknown, path = 'uiConfig'): asserts value is BrickflowUiConfigObject {
  if (!isRecord(value)) {
    throw new TypeError(`${path} must be an object.`)
  }

  for (const [key, childValue] of Object.entries(value)) {
    const childPath = `${path}.${key}`

    if (typeof childValue === 'string' || isBrickflowUiStyleReference(childValue)) {
      continue
    }

    if (isRecord(childValue)) {
      validateUiConfig(childValue, childPath)
      continue
    }

    throw new TypeError(`${childPath} must be a string, UI_STYLE reference, or an object.`)
  }
}

function validateUiStyles(value: unknown, path = 'uiStyles'): asserts value is BrickflowUiStyles {
  if (!isRecord(value)) {
    throw new TypeError(`${path} must be an object.`)
  }

  for (const [key, childValue] of Object.entries(value)) {
    const childPath = `${path}.${key}`

    if (isBrickflowUiStyleReference(childValue)) {
      throw new TypeError(`${childPath} cannot reference UI_STYLE.`)
    }

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
