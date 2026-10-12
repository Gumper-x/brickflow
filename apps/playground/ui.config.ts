import { defineBrickflowUi, UI_STYLE } from '../../packages/ui/src/runtime/tailwind'

export default defineBrickflowUi({
  uiConfig: {
    button: {
      colorClasses: {
        alt: {
          ghost: UI_STYLE.color.alt.ghost,
          mist: UI_STYLE.color.alt.mist,
          soft: UI_STYLE.color.alt.soft,
          solid: UI_STYLE.color.alt.solid,
          subtle: UI_STYLE.color.alt.subtle,
        },
        danger: {
          ghost: UI_STYLE.color.danger.ghost,
          mist: UI_STYLE.color.danger.mist,
          soft: UI_STYLE.color.danger.soft,
          solid: UI_STYLE.color.danger.solid,
          subtle: UI_STYLE.color.danger.subtle,
        },
        info: {
          ghost: UI_STYLE.color.info.ghost,
          mist: UI_STYLE.color.info.mist,
          soft: UI_STYLE.color.info.soft,
          solid: UI_STYLE.color.info.solid,
          subtle: UI_STYLE.color.info.subtle,
        },
        main: {
          ghost: UI_STYLE.color.main.ghost,
          mist: UI_STYLE.color.main.mist,
          soft: UI_STYLE.color.main.soft,
          solid: UI_STYLE.color.main.solid,
          subtle: UI_STYLE.color.main.subtle,
        },
        plain: {
          ghost: UI_STYLE.color.plain.ghost,
          mist: UI_STYLE.color.plain.mist,
          soft: UI_STYLE.color.plain.soft,
          solid: UI_STYLE.color.plain.solid,
          subtle: UI_STYLE.color.plain.subtle,
        },
        warn: {
          ghost: UI_STYLE.color.warn.ghost,
          mist: UI_STYLE.color.warn.mist,
          soft: UI_STYLE.color.warn.soft,
          solid: UI_STYLE.color.warn.solid,
          subtle: UI_STYLE.color.warn.subtle,
        },
        win: {
          ghost: UI_STYLE.color.win.ghost,
          mist: UI_STYLE.color.win.mist,
          soft: UI_STYLE.color.win.soft,
          solid: UI_STYLE.color.win.solid,
          subtle: UI_STYLE.color.win.subtle,
        },
      },
      colorDefault: 'main',
      loadingIconName: 'loading',
      loadingIconTransition: 'poof',
      sizeClasses: {
        lg: UI_STYLE.size.lg,
        md: UI_STYLE.size.md,
        sm: UI_STYLE.size.sm,
        xl: UI_STYLE.size.xl,
        xs: UI_STYLE.size.xs,
      },
      sizeDefault: 'md',
      sizeIconClasses: {
        lg: UI_STYLE.size.lgIcon,
        md: UI_STYLE.size.mdIcon,
        sm: UI_STYLE.size.smIcon,
        xl: UI_STYLE.size.xlIcon,
        xs: UI_STYLE.size.xsIcon,
      },
      variantDefault: 'solid',
    },
    input: {
      sizeClasses: {
        lg: {
          description: UI_STYLE.size.lg.description,
          field: UI_STYLE.size.lg.field,
          fieldWrap: UI_STYLE.size.lg.fieldWrap,
          icon: UI_STYLE.size.lg.icon,
          label: UI_STYLE.size.lg.label,
        },
        md: {
          description: UI_STYLE.size.md.description,
          field: UI_STYLE.size.md.field,
          fieldWrap: UI_STYLE.size.md.fieldWrap,
          icon: UI_STYLE.size.md.icon,
          label: UI_STYLE.size.md.label,
        },
        sm: {
          description: UI_STYLE.size.sm.description,
          field: UI_STYLE.size.sm.field,
          fieldWrap: UI_STYLE.size.sm.fieldWrap,
          icon: UI_STYLE.size.sm.icon,
          label: UI_STYLE.size.sm.label,
        },
        xl: {
          description: UI_STYLE.size.xl.description,
          field: UI_STYLE.size.xl.field,
          fieldWrap: UI_STYLE.size.xl.fieldWrap,
          icon: UI_STYLE.size.xl.icon,
          label: UI_STYLE.size.xl.label,
        },
      },
      sizeDefault: 'md',
      variantClasses: {
        solid: {
          description: UI_STYLE.variant.solid.description,
          field: UI_STYLE.variant.solid.field,
          fieldWrap: UI_STYLE.variant.solid.fieldWrap,
          icon: UI_STYLE.variant.solid.icon,
          label: UI_STYLE.variant.solid.label,
        },
        text: {
          description: UI_STYLE.variant.text.description,
          field: UI_STYLE.variant.text.field,
          fieldWrap: UI_STYLE.variant.text.fieldWrap,
          icon: UI_STYLE.variant.text.icon,
          label: UI_STYLE.variant.text.label,
        },
      },
      variantDefault: 'solid',
    },
  },
  uiStyles: {
    button: {
      animationTap: 'global-tap-animation',
      base: 'relative inline-flex cursor-pointer items-center justify-center overflow-hidden font-sans font-medium whitespace-nowrap transition duration-150 ease-in select-none focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-105',
      color: {
        alt: {
          ghost: 'text-alt-400 hover:bg-alt-950',
          mist: 'global-border-gradient bg-alt-900/10 text-plain-200 backdrop-blur-xs backdrop-saturate-140 hover:brightness-115',
          soft: 'bg-alt-950 text-alt-400 hover:brightness-115',
          solid:
            'global-border-gradient bg-linear-to-b from-alt-500 to-alt-700 text-plain-200 hover:brightness-115',
          subtle: 'global-border-gradient border-alt-700 bg-alt-950 text-alt-400 hover:brightness-115',
        },
        danger: {
          ghost: 'text-danger-500 hover:bg-danger-950',
          mist: 'global-border-gradient bg-danger-900/10 text-plain-200 backdrop-blur-xs backdrop-saturate-140 hover:brightness-115',
          soft: 'bg-danger-950 text-danger-500 hover:brightness-115',
          solid:
            'global-border-gradient bg-linear-to-b from-danger-500 to-danger-700 text-plain-200 hover:brightness-115',
          subtle: 'global-border-gradient border-danger-800 bg-danger-950 text-danger-500 hover:brightness-115',
        },
        info: {
          ghost: 'text-info-400 hover:bg-info-950',
          mist: 'global-border-gradient bg-info-900/10 text-plain-200 backdrop-blur-xs backdrop-saturate-140 hover:brightness-115',
          soft: 'bg-info-950 text-info-400 hover:brightness-115',
          solid:
            'global-border-gradient bg-linear-to-b from-info-500 to-info-700 text-plain-200 hover:brightness-115',
          subtle: 'global-border-gradient border-info-700 bg-info-950 text-info-400 hover:brightness-115',
        },
        main: {
          ghost: 'text-main-400 hover:bg-main-900',
          mist: 'global-border-gradient bg-main-900/10 text-plain-200 backdrop-blur-xs backdrop-saturate-140 hover:brightness-115',
          soft: 'bg-main-900 text-main-300 hover:brightness-115',
          solid:
            'global-border-gradient bg-linear-to-b from-main-500 to-main-700 text-plain-200 hover:brightness-115',
          subtle: 'global-border-gradient border-main-400 bg-main-900 text-main-300 hover:brightness-115',
        },
        plain: {
          ghost: 'text-plain-200 hover:bg-plain-800',
          mist: 'global-border-gradient bg-plain-900/10 text-plain-200 backdrop-blur-xs backdrop-saturate-140 hover:brightness-115',
          soft: 'bg-plain-800 text-plain-300 hover:brightness-115',
          solid:
            'global-border-gradient bg-linear-to-b from-plain-700 to-plain-800 text-plain-200 hover:brightness-115',
          subtle: 'global-border-gradient border-plain-700 bg-plain-800 text-plain-300 hover:brightness-115',
        },
        warn: {
          ghost: 'text-warn-500 hover:bg-warn-950',
          mist: 'global-border-gradient bg-warn-900/10 text-plain-200 backdrop-blur-xs backdrop-saturate-140 hover:brightness-115',
          soft: 'bg-warn-950 text-warn-500 hover:brightness-115',
          solid:
            'global-border-gradient bg-linear-to-b from-warn-500 to-warn-700 text-plain-200 hover:brightness-115',
          subtle: 'global-border-gradient border-warn-700 bg-warn-950 text-warn-500 hover:brightness-115',
        },
        win: {
          ghost: 'text-win-300 hover:bg-win-950',
          mist: 'global-border-gradient bg-win-900/10 text-plain-200 backdrop-blur-xs backdrop-saturate-140 hover:brightness-115',
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
        square: 'aspect-square px-0',
      },
    },
    input: {
      align: {
        center: 'text-center',
        right: 'text-right',
      },
      base: 'relative inline-flex w-full min-w-0 flex-col gap-1.5 font-sans',
      description: 'pl-0.5',
      field: 'min-w-0 flex-1 bg-transparent outline-none disabled:cursor-not-allowed',
      fieldWrap: 'relative flex min-w-0 cursor-text items-center gap-2 transition-colors duration-150',
      label: 'w-fit pl-0.5 font-medium',
      size: {
        lg: {
          description: 'text-xs',
          field: 'text-base',
          fieldWrap: 'min-h-12 rounded-2xl px-4 text-base',
          icon: 'text-xl',
          label: 'text-sm',
        },
        md: {
          description: 'text-xs',
          field: 'text-sm',
          fieldWrap: 'min-h-10 rounded-xl px-3 text-sm',
          icon: 'text-base',
          label: 'text-sm',
        },
        sm: {
          description: 'text-xs',
          field: 'text-sm',
          fieldWrap: 'min-h-9 rounded-xl px-2.5 text-sm',
          icon: 'text-base',
          label: 'text-sm',
        },
        xl: {
          description: 'text-xs',
          field: 'text-lg',
          fieldWrap: 'min-h-14 rounded-2xl px-4.5 text-lg',
          icon: 'text-2xl',
          label: 'text-sm',
        },
      },
      slot: {
        hasAction: 'cursor-pointer',
        leading: 'inline-flex shrink-0 items-center justify-center text-plain-400',
        trailing: 'inline-flex shrink-0 items-center justify-center text-plain-400',
      },
      state: {
        autoWidth: 'w-fit',
        autoWidthField: 'flex-none',
        disabled: 'cursor-not-allowed opacity-50',
        readonly: 'opacity-75',
      },
      variant: {
        solid: {
          description: 'text-plain-500',
          field: 'text-plain-200 placeholder:text-plain-500',
          fieldWrap: 'global-border-gradient global-border-gradient-half bg-plain-900',
          icon: 'text-plain-500',
          label: 'text-plain-300',
        },
        text: {
          description: 'text-plain-500',
          field: 'text-plain-100 placeholder:text-plain-500',
          fieldWrap: 'global-border-gradient global-border-gradient-half',
          icon: 'text-plain-500',
          label: 'text-plain-300',
        },
      },
    },
  },
})
