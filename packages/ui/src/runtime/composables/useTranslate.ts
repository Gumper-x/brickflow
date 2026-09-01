import type { RouteRecordNameGeneric } from 'vue-router'

import { type App, inject, type InjectionKey, type Ref, ref } from 'vue'

export interface BrickflowConfig {
  i18n?: BrickflowI18n
}

export interface BrickflowI18n {
  getRealName: (route: { name: RouteRecordNameGeneric }) => string
  getRealPath: (route: BrickflowRouteLocationParam | string) => string
  locale: Ref<string>
  localePath: (route: BrickflowRouteLocationParam | string) => string
}

export interface BrickflowRouteLocationParam {
  path: string
  query: Record<string, unknown>
}

const brickflowConfigKey: InjectionKey<BrickflowConfig> = Symbol('brickflow-config')

const useTranslateFallback = (): BrickflowI18n => {
  const getRealPath = (route: BrickflowRouteLocationParam | string): string =>
    typeof route === 'string' ? route : route.path

  return {
    getRealName: (route) => String(route.name),
    getRealPath,
    locale: ref('en'),
    localePath: getRealPath,
  }
}

export function provideBrickflowConfig<T extends BrickflowConfig>(app: App, config: T): void {
  app.provide(brickflowConfigKey, config)
}

export function useTranslate(): BrickflowI18n {
  return inject(brickflowConfigKey, undefined)?.i18n ?? useTranslateFallback()
}
