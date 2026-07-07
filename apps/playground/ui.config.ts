import { defineBrickflowUiConfig } from '../../packages/ui/src/runtime/tailwind'

export default defineBrickflowUiConfig({
  uiStyles: {
    button: {
      base: 'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-[-0.01em] transition-all duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brick-500 disabled:pointer-events-none disabled:opacity-50',
      size: {
        kio: 'text-red-400',
        lol: 'text-red-400',
        md: 'min-h-12 px-5 text-sm/6',
      },
      variant: {
        primary:
          'border border-brick-500/80 bg-linear-to-r from-brick-500 to-brick-600 text-white shadow-brick hover:from-brick-400 hover:to-brick-500',
        secondary:
          'border border-brick-200/80 bg-white/70 text-ink-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] hover:border-brick-400/50 hover:bg-brick-50',
      },
    },
    state: {
      world: 'text-sm',
    },
  },
})
