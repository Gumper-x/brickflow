import { defineBrickflowUiConfig } from '../../packages/ui/src/runtime/tailwind'

export default defineBrickflowUiConfig({
  uiStyles: {
    button: {
      base: 'relative inline-flex cursor-pointer items-center justify-center overflow-hidden font-sans font-medium whitespace-nowrap transition duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2',
      color: {
        alt: {
          base: 'focus-visible:outline-alt-400',
          ghost: 'text-alt-400 hover:bg-alt-950',
          glass: 'bg-alt-950/60 text-alt-400',
          interactive: 'hover:brightness-110',
          soft: 'bg-alt-950 text-alt-400',
          solid: 'bg-linear-to-b from-alt-500 to-alt-700 text-plain-50',
          subtle: 'border-alt-700 bg-alt-950 text-alt-400',
        },
        danger: {
          base: 'focus-visible:outline-danger-500',
          ghost: 'text-danger-500 hover:bg-danger-950',
          glass: 'bg-danger-950/60 text-danger-500',
          interactive: 'hover:brightness-110',
          soft: 'bg-danger-950 text-danger-500',
          solid: 'bg-linear-to-b from-danger-700 to-danger-800 text-plain-50',
          subtle: 'border-danger-800 bg-danger-950 text-danger-500',
        },
        info: {
          base: 'focus-visible:outline-info-400',
          ghost: 'text-info-400 hover:bg-info-950',
          glass: 'bg-info-950/60 text-info-400',
          interactive: 'hover:brightness-110',
          soft: 'bg-info-950 text-info-400',
          solid: 'bg-linear-to-b from-info-500 to-info-600 text-plain-50',
          subtle: 'border-info-700 bg-info-950 text-info-400',
        },
        main: {
          base: 'focus-visible:outline-main-400',
          ghost: 'text-main-400 hover:bg-main-900',
          glass: 'bg-main-900/60 text-main-400',
          interactive: 'hover:brightness-110',
          soft: 'bg-main-900 text-main-400',
          solid: 'bg-linear-to-b from-main-500 to-main-700 text-plain-50',
          subtle: 'border-main-400 bg-main-900 text-main-400',
        },
        plain: {
          base: 'focus-visible:outline-plain-50',
          ghost: 'text-plain-200 hover:bg-plain-800',
          glass: 'bg-plain-900/10 text-plain-200',
          interactive: 'hover:brightness-125',
          soft: 'bg-plain-800 text-plain-200',
          solid: 'bg-linear-to-b from-plain-700 to-plain-800 text-plain-200',
          subtle: 'border-plain-700 bg-plain-800 text-plain-200',
        },
        warn: {
          base: 'focus-visible:outline-warn-500',
          ghost: 'text-warn-500 hover:bg-warn-950',
          glass: 'bg-warn-950/60 text-warn-500',
          interactive: 'hover:brightness-110',
          soft: 'bg-warn-950 text-warn-500',
          solid: 'bg-linear-to-b from-warn-500 to-warn-600 text-plain-50',
          subtle: 'border-warn-700 bg-warn-950 text-warn-500',
        },
        win: {
          base: 'focus-visible:outline-win-300',
          ghost: 'text-win-300 hover:bg-win-950',
          glass: 'bg-win-950/60 text-win-300',
          interactive: 'hover:brightness-110',
          soft: 'bg-win-950 text-win-300',
          solid: 'bg-linear-to-b from-win-600 to-win-700 text-plain-50',
          subtle: 'border-win-800 bg-win-950 text-win-300',
        },
      },
      effect: {
        surfaceBorder: 'ring-1 ring-inset ring-white/15',
      },
      size: {
        lg: 'min-h-11 gap-1.5 rounded-2xl px-4 text-base/6',
        md: 'min-h-10 gap-1.5 rounded-xl px-3 text-sm/5',
        sm: 'min-h-8 gap-1.5 rounded-xl px-2.5 text-sm/5',
        xl: 'min-h-12 gap-2 rounded-2xl px-5 text-base/6',
        xs: 'min-h-8 gap-1.5 rounded-xl px-2.5 text-sm/5',
      },
      slot: {
        label: 'relative z-10 truncate',
        leading: 'relative z-10 size-5 shrink-0',
        loading:
          'relative z-10 size-5 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent',
        trailing: 'relative z-10 size-5 shrink-0',
      },
      state: {
        block: 'w-full',
        disabled: 'pointer-events-none opacity-50',
        square: 'aspect-square px-0',
      },
      variant: {
        ghost: '',
        glass: 'backdrop-blur-md',
        soft: 'active:brightness-95',
        solid: 'active:brightness-95',
        subtle: 'border active:brightness-95',
      },
    },
  },
})
