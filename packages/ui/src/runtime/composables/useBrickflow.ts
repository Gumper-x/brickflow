import { type App, inject, type InjectionKey } from 'vue'

import type { RuleMessages } from '../utils/rules'
import type { BrickflowI18n } from './useTranslate'

export interface BrickflowConfig {
  i18n?: BrickflowI18n
  rules?: RuleMessages
}

const brickflowConfigKey: InjectionKey<BrickflowConfig> = Symbol('brickflow-config')

export function provideBrickflow<T extends BrickflowConfig>(app: App, config: T): void {
  app.provide(brickflowConfigKey, config)
}

export function useBrickflow(): BrickflowConfig {
  return inject(brickflowConfigKey, {})
}
