import { onMounted, reactive } from 'vue'

type ScreenKey = keyof ScreenState

interface ScreenState {
  dk: boolean
  lp: boolean
  mb: boolean
  ms: boolean
  tb: boolean
}

/**
 * До mounted все диапазоны активны.
 *
 * SSR и первый клиентский рендер совпадают,
 * а неподходящие элементы сразу скрываются CSS-классами.
 */
const state = reactive<ScreenState>({
  dk: true,
  lp: true,
  mb: true,
  ms: true,
  tb: true,
})

const queries = {
  dk: '(width >= 1440px)',
  lp: '(1024px <= width < 1440px)',
  mb: '(480px <= width < 768px)',
  ms: '(width < 480px)',
  tb: '(768px <= width < 1024px)',
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
  get dk() {
    return state.dk
  },

  dkClass: 'hidden dk:block',

  get lp() {
    return state.lp
  },

  lpClass: 'hidden lp:block tb:hidden',

  get mb() {
    return state.mb
  },
  mbClass: 'hidden mb:block ms:hidden',

  get ms() {
    return state.ms
  },

  msClass: 'hidden ms:block',

  ready,

  get tb() {
    return state.tb
  },

  tbClass: 'hidden tb:block mb:hidden',
} as const

export function useScreen(): typeof screen {
  onMounted(initialize)

  return screen
}
