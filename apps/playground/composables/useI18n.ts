import { ref } from 'vue'

import type { BrickflowI18n } from '../../../packages/ui/src/runtime/composables/useTranslate'

export interface PlaygroundI18n extends BrickflowI18n {
  t: (key: string) => string
}

export function useI18n(): PlaygroundI18n {
  const localePath = (route: string | { path: string }): string => (typeof route === 'string' ? route : route.path)
  const t = (key: string): string => key

  return {
    getRealName: (route) => String(route.name),
    getRealPath: localePath,
    locale: ref('en'),
    localePath,
    t,
  }
}
