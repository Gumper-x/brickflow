import { defineBrickflowUiConfig } from '../../packages/ui/src/runtime/tailwind'

const val = (s: string): string => s
export default defineBrickflowUiConfig({
  uiStyles: {
    button: {
      animationTap: 'global-tap-animation',
      base: 'relative inline-flex cursor-pointer items-center justify-center overflow-hidden font-sans font-medium whitespace-nowrap transition duration-150 ease-in select-none focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-105',
      color: {
        alt: {
          ghost: 'text-alt-400 hover:bg-alt-950',
          glass:
            'global-border-gradient bg-alt-900/10 text-plain-200 backdrop-blur-xs backdrop-saturate-140 hover:brightness-115',
          soft: 'bg-alt-950 text-alt-400 hover:brightness-115',
          solid:
            'global-border-gradient bg-linear-to-b from-alt-500 to-alt-700 text-plain-200 hover:brightness-115',
          subtle: 'global-border-gradient border-alt-700 bg-alt-950 text-alt-400 hover:brightness-115',
        },
        danger: {
          ghost: 'text-danger-500 hover:bg-danger-950',
          glass:
            'global-border-gradient bg-danger-900/10 text-plain-200 backdrop-blur-xs backdrop-saturate-140 hover:brightness-115',
          soft: 'bg-danger-950 text-danger-500 hover:brightness-115',
          solid:
            'global-border-gradient bg-linear-to-b from-danger-500 to-danger-700 text-plain-200 hover:brightness-115',
          subtle: 'global-border-gradient border-danger-800 bg-danger-950 text-danger-500 hover:brightness-115',
        },
        info: {
          ghost: 'text-info-400 hover:bg-info-950',
          glass:
            'global-border-gradient bg-info-900/10 text-plain-200 backdrop-blur-xs backdrop-saturate-140 hover:brightness-115',
          soft: 'bg-info-950 text-info-400 hover:brightness-115',
          solid:
            'global-border-gradient bg-linear-to-b from-info-500 to-info-700 text-plain-200 hover:brightness-115',
          subtle: 'global-border-gradient border-info-700 bg-info-950 text-info-400 hover:brightness-115',
        },
        main: {
          ghost: 'text-main-400 hover:bg-main-900',
          glass:
            'global-border-gradient bg-main-900/10 text-plain-200 backdrop-blur-xs backdrop-saturate-140 hover:brightness-115',
          soft: 'bg-main-900 text-main-300 hover:brightness-115',
          solid:
            'global-border-gradient bg-linear-to-b from-main-500 to-main-700 text-plain-200 hover:brightness-115',
          subtle: 'global-border-gradient border-main-400 bg-main-900 text-main-300 hover:brightness-115',
        },
        plain: {
          ghost: 'text-plain-200 hover:bg-plain-800',
          glass:
            'global-border-gradient bg-plain-900/10 text-plain-200 backdrop-blur-xs backdrop-saturate-140 hover:brightness-115',
          soft: 'bg-plain-800 text-plain-300 hover:brightness-115',
          solid:
            'global-border-gradient bg-linear-to-b from-plain-700 to-plain-800 text-plain-200 hover:brightness-115',
          subtle: 'global-border-gradient border-plain-700 bg-plain-800 text-plain-300 hover:brightness-115',
        },
        warn: {
          ghost: 'text-warn-500 hover:bg-warn-950',
          glass:
            'global-border-gradient bg-warn-900/10 text-plain-200 backdrop-blur-xs backdrop-saturate-140 hover:brightness-115',
          soft: 'bg-warn-950 text-warn-500 hover:brightness-115',
          solid:
            'global-border-gradient bg-linear-to-b from-warn-500 to-warn-700 text-plain-200 hover:brightness-115',
          subtle: 'global-border-gradient border-warn-700 bg-warn-950 text-warn-500 hover:brightness-115',
        },
        win: {
          ghost: 'text-win-300 hover:bg-win-950',
          glass:
            'global-border-gradient bg-win-900/10 text-plain-200 backdrop-blur-xs backdrop-saturate-140 hover:brightness-115',
          soft: 'bg-win-950 text-win-300 hover:brightness-115',
          solid:
            'global-border-gradient bg-linear-to-b from-win-500 to-win-700 text-plain-200 hover:brightness-115',
          subtle: 'global-border-gradient border-win-800 bg-win-950 text-win-300 hover:brightness-115',
        },
      },
      size: {
        lg: 'min-h-12 gap-1.5 rounded-2xl px-4 text-base',
        lgIcon: 'text-xl',
        md: 'min-h-10 gap-1.5 rounded-xl px-3 text-sm',
        mdIcon: 'text-base',
        sm: 'min-h-9 gap-1.5 rounded-xl px-2.5 text-sm',
        smIcon: 'text-base',
        xl: 'min-h-14 gap-2 rounded-2xl px-4.5 text-lg',
        xlIcon: 'text-2xl',
        xs: 'min-h-8 gap-1 rounded-lg px-2.5 text-xs',
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
        loadingIconName: val('loading'),
        square: 'aspect-square px-0',
      },
    },
  },
})
