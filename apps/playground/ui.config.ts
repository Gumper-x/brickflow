import { defineBrickflowUiConfig } from '../../packages/ui/src/runtime/tailwind'

export default defineBrickflowUiConfig({
  uiStyles: {
    button: {
      animationTap: 'tap-animation',
      base: 'relative inline-flex cursor-pointer items-center justify-center overflow-hidden font-sans font-medium whitespace-nowrap transition duration-150 ease-in focus-visible:outline-2 focus-visible:outline-offset-2 select-none active:scale-105',
      color: {
        alt: {
          ghost: 'text-alt-400 hover:bg-alt-950',
          glass:
            'hover:brightness-115 backdrop-blur-xs backdrop-saturate-140 bg-alt-900/10 text-plain-200 border-gradient',
          soft: 'hover:brightness-115 bg-alt-950 text-alt-400',
          solid: 'hover:brightness-115 bg-linear-to-b from-alt-500 to-alt-700 text-plain-200 border-gradient',
          subtle: 'hover:brightness-115 border-alt-700 bg-alt-950 text-alt-400 border-gradient',
        },
        danger: {
          ghost: 'text-danger-500 hover:bg-danger-950',
          glass:
            'hover:brightness-115 backdrop-blur-xs backdrop-saturate-140 bg-danger-900/10 text-plain-200 border-gradient',
          soft: 'hover:brightness-115 bg-danger-950 text-danger-500',
          solid:
            'hover:brightness-115 bg-linear-to-b from-danger-500 to-danger-700 text-plain-200 border-gradient',
          subtle: 'hover:brightness-115 border-danger-800 bg-danger-950 text-danger-500 border-gradient',
        },
        info: {
          ghost: 'text-info-400 hover:bg-info-950',
          glass:
            'hover:brightness-115 backdrop-blur-xs backdrop-saturate-140 bg-info-900/10 text-plain-200 border-gradient',
          soft: 'hover:brightness-115 bg-info-950 text-info-400',
          solid: 'hover:brightness-115 bg-linear-to-b from-info-500 to-info-700 text-plain-200 border-gradient',
          subtle: 'hover:brightness-115 border-info-700 bg-info-950 text-info-400 border-gradient',
        },
        main: {
          ghost: 'text-main-400 hover:bg-main-900',
          glass:
            'hover:brightness-115 backdrop-blur-xs backdrop-saturate-140 bg-main-900/10 text-plain-200 border-gradient',
          soft: 'hover:brightness-115 bg-main-900 text-main-300',
          solid: 'hover:brightness-115 bg-linear-to-b from-main-500 to-main-700 text-plain-200 border-gradient',
          subtle: 'hover:brightness-115 border-main-400 bg-main-900 text-main-300 border-gradient',
        },
        plain: {
          ghost: 'text-plain-200 hover:bg-plain-800',
          glass:
            'hover:brightness-115 backdrop-blur-xs backdrop-saturate-140 bg-plain-900/10 text-plain-200 border-gradient',
          soft: 'hover:brightness-115 bg-plain-800 text-plain-300',
          solid: 'hover:brightness-115 bg-linear-to-b from-plain-700 to-plain-800 text-plain-200 border-gradient',
          subtle: 'hover:brightness-115 border-plain-700 bg-plain-800 text-plain-300 border-gradient',
        },
        warn: {
          ghost: 'text-warn-500 hover:bg-warn-950',
          glass:
            'hover:brightness-115 backdrop-blur-xs backdrop-saturate-140 bg-warn-900/10 text-plain-200 border-gradient',
          soft: 'hover:brightness-115 bg-warn-950 text-warn-500',
          solid: 'hover:brightness-115 bg-linear-to-b from-warn-500 to-warn-700 text-plain-200 border-gradient',
          subtle: 'hover:brightness-115 border-warn-700 bg-warn-950 text-warn-500 border-gradient',
        },
        win: {
          ghost: 'text-win-300 hover:bg-win-950',
          glass:
            'hover:brightness-115 backdrop-blur-xs backdrop-saturate-140 bg-win-900/10 text-plain-200 border-gradient',
          soft: 'hover:brightness-115 bg-win-950 text-win-300',
          solid: 'hover:brightness-115 bg-linear-to-b from-win-500 to-win-700 text-plain-200 border-gradient',
          subtle: 'hover:brightness-115 border-win-800 bg-win-950 text-win-300 border-gradient',
        },
      },
      size: {
        lg: 'gap-1.5 rounded-2xl px-4 text-base min-h-12',
        lgIcon: 'text-xl',
        md: 'gap-1.5 rounded-xl px-3 text-sm min-h-10',
        mdIcon: 'text-base',
        sm: 'gap-1.5 rounded-xl px-2.5 text-sm min-h-9',
        smIcon: 'text-base',
        xl: 'gap-2 rounded-2xl px-4.5 text-lg min-h-14',
        xlIcon: 'text-2xl',
        xs: 'gap-1 rounded-lg px-2.5 text-xs min-h-8',
        xsIcon: 'text-sm',
      },
      slot: {
        label: 'relative z-10 truncate',
        leading: 'relative z-10 shrink-0 leading-0',
        trailing: 'relative z-10 shrink-0 leading-0',
      },
      state: {
        block: 'w-full',
        disabled: 'pointer-events-none opacity-50',
        loading: 'animate-spin',
        loadingIconName: 'loading',
        square: 'aspect-square px-0',
      },
    },
  },
})
