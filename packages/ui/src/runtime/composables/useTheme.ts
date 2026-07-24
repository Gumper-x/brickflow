import { useState } from 'nuxt/app'
import { computed, type ComputedRef, onMounted, onUnmounted, type Ref, watch } from 'vue'

export type Theme = 'dark' | 'light'

const THEME_STORAGE_KEY = 'ui-theme'
const THEME_STATE = 'ui-theme'

export interface ThemeController {
  isDark: ComputedRef<boolean>
  isLight: ComputedRef<boolean>
  setTheme: (value: Theme) => void
  theme: Ref<Theme>
  toggleTheme: () => void
}

const normalizeTheme = (value: null | string | undefined): Theme => (value === 'light' ? 'light' : 'dark')

const getSystemTheme = (): Theme => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

const getInitialTheme = (): Theme => {
  if (!import.meta.client) {
    return 'dark'
  }

  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)

    if (storedTheme === 'dark' || storedTheme === 'light') {
      return storedTheme
    }
  } catch {
    // localStorage can be disabled by the browser.
  }

  return getSystemTheme()
}

const applyTheme = (theme: Theme): void => {
  if (!import.meta.client) {
    return
  }

  const root = document.documentElement
  root.dataset.uiTheme = theme
  root.style.colorScheme = theme
}

/**
 * Controls the colour theme used by the UI catalogue.
 *
 * The selected theme is stored in localStorage. A bootstrap script applies it
 * before Nuxt mounts the application.
 */
export function useTheme(): ThemeController {
  const theme = useState<Theme>(THEME_STATE, getInitialTheme)
  const synchronizeTheme = (): void => {
    const nextTheme = getInitialTheme()
    theme.value = nextTheme
    applyTheme(nextTheme)
  }

  if (import.meta.client) {
    synchronizeTheme()
  }

  onMounted(() => {
    window.addEventListener('pageshow', synchronizeTheme)
  })

  onUnmounted(() => {
    window.removeEventListener('pageshow', synchronizeTheme)
  })

  watch(
    theme,
    (value) => {
      const nextTheme = normalizeTheme(value)

      if (nextTheme !== value) {
        theme.value = nextTheme
        return
      }

      if (import.meta.client) {
        applyTheme(nextTheme)

        try {
          localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
        } catch {
          // localStorage can be disabled by the browser.
        }
      }
    },
    { flush: 'sync' },
  )

  const isDark = computed(() => theme.value === 'dark')
  const isLight = computed(() => theme.value === 'light')

  const setTheme = (value: Theme): void => {
    theme.value = value
  }

  const toggleTheme = (): void => {
    theme.value = isDark.value ? 'light' : 'dark'
  }

  return {
    isDark,
    isLight,
    setTheme,
    theme,
    toggleTheme,
  }
}
