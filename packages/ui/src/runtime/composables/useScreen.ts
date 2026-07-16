import { onMounted, reactive } from 'vue'

type ScreenKey = keyof ScreenState

interface ScreenState {
  base: boolean
  lg: boolean
  md: boolean
  sm: boolean
  xl: boolean
  xxl: boolean
}

/**
 * До mounted все диапазоны активны.
 *
 * SSR и первый клиентский рендер совпадают,
 * а неподходящие элементы сразу скрываются CSS-классами.
 */
const state = reactive<ScreenState>({
  base: true,
  lg: true,
  md: true,
  sm: true,
  xl: true,
  xxl: true,
})

const queries = {
  base: '(width < 40rem)',
  lg: '(64rem <= width < 80rem)',
  md: '(48rem <= width < 64rem)',
  sm: '(40rem <= width < 48rem)',
  xl: '(80rem <= width < 96rem)',
  xxl: '(width >= 96rem)',
} satisfies Record<ScreenKey, string>

let initialized = false
let resolveReady: () => void = () => undefined

const ready = import.meta.client
  ? new Promise<void>((resolve) => {
      resolveReady = resolve
    })
  : Promise.resolve()

function initialize(): void {
  if (initialized) {
    return
  }

  initialized = true

  for (const [key, query] of Object.entries(queries) as Array<[ScreenKey, string]>) {
    const mediaQuery = window.matchMedia(query)

    const update = (event: MediaQueryList | MediaQueryListEvent): void => {
      state[key] = event.matches
    }

    update(mediaQuery)
    mediaQuery.addEventListener('change', update)
  }

  resolveReady()
}

const screen = {
  get base() {
    return state.base
  },

  baseClass: 'sm:hidden',

  get lg() {
    return state.lg
  },

  lgClass: 'max-lg:hidden xl:hidden',

  get md() {
    return state.md
  },

  mdClass: 'max-md:hidden lg:hidden',

  ready,
  get sm() {
    return state.sm
  },
  smClass: 'max-sm:hidden md:hidden',
  get xl() {
    return state.xl
  },
  xlClass: 'max-xl:hidden 2xl:hidden',
  get xxl() {
    return state.xxl
  },

  xxlClass: 'max-2xl:hidden',
} as const

export function useScreen(): typeof screen {
  onMounted(initialize)

  return screen
}
