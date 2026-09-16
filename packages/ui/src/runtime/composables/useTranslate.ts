import type { RouteRecordNameGeneric } from 'vue-router'

import { type Ref, shallowRef } from 'vue'

import { useBrickflow } from './useBrickflow'

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

const getFallbackRealPath = (route: BrickflowRouteLocationParam | string): string =>
  typeof route === 'string' ? route : route.path

const translateFallback: BrickflowI18n = {
  getRealName: (route) => String(route.name),
  getRealPath: getFallbackRealPath,
  locale: shallowRef('en'),
  localePath: getFallbackRealPath,
}

export function useTranslate(): BrickflowI18n {
  return useBrickflow().i18n ?? translateFallback
}
