import { ref } from 'vue'

import type { BrickflowI18n } from '../../../packages/ui/src/runtime/composables/useTranslate'

export function useI18n(): BrickflowI18n {
  const localePath = (route: string | { path: string }): string => (typeof route === 'string' ? route : route.path)

  return {
    getRealName: (route) => String(route.name),
    getRealPath: localePath,
    locale: ref('en'),
    localePath,
  }
}
