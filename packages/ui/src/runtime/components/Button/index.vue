<script setup lang="ts">
  import type { RouteLocationRaw } from 'vue-router'

  import { computed } from 'vue'

  import BaseLink from '../Link/index.vue'

  defineOptions({
    inheritAttrs: false,
  })

  const props = withDefaults(defineProps<Props>(), {
    color: 'main',
    size: 'md',
    to: undefined,
    type: 'button',
    variant: 'solid',
  })
  type ButtonColor = 'alt' | 'danger' | 'info' | 'main' | 'plain' | 'warn' | 'win'
  type ButtonSize = 'lg' | 'md' | 'sm' | 'xl' | 'xs'
  type ButtonVariant = 'ghost' | 'glass' | 'soft' | 'solid' | 'subtle'

  interface Props {
    block?: boolean
    color?: ButtonColor
    disabled?: boolean
    loading?: boolean
    size?: ButtonSize
    square?: boolean
    to?: RouteLocationRaw
    type?: 'button' | 'reset' | 'submit'
    variant?: ButtonVariant
  }

  const sizeClasses = {
    lg: UI_STYLE.size.lg,
    md: UI_STYLE.size.md,
    sm: UI_STYLE.size.sm,
    xl: UI_STYLE.size.xl,
    xs: UI_STYLE.size.xs,
  } satisfies Record<ButtonSize, string>

  const colorClasses = {
    alt: {
      base: UI_STYLE.color.alt.base,
      ghost: UI_STYLE.color.alt.ghost,
      glass: UI_STYLE.color.alt.glass,
      interactive: UI_STYLE.color.alt.interactive,
      soft: UI_STYLE.color.alt.soft,
      solid: UI_STYLE.color.alt.solid,
      subtle: UI_STYLE.color.alt.subtle,
    },
    danger: {
      base: UI_STYLE.color.danger.base,
      ghost: UI_STYLE.color.danger.ghost,
      glass: UI_STYLE.color.danger.glass,
      interactive: UI_STYLE.color.danger.interactive,
      soft: UI_STYLE.color.danger.soft,
      solid: UI_STYLE.color.danger.solid,
      subtle: UI_STYLE.color.danger.subtle,
    },
    info: {
      base: UI_STYLE.color.info.base,
      ghost: UI_STYLE.color.info.ghost,
      glass: UI_STYLE.color.info.glass,
      interactive: UI_STYLE.color.info.interactive,
      soft: UI_STYLE.color.info.soft,
      solid: UI_STYLE.color.info.solid,
      subtle: UI_STYLE.color.info.subtle,
    },
    main: {
      base: UI_STYLE.color.main.base,
      ghost: UI_STYLE.color.main.ghost,
      glass: UI_STYLE.color.main.glass,
      interactive: UI_STYLE.color.main.interactive,
      soft: UI_STYLE.color.main.soft,
      solid: UI_STYLE.color.main.solid,
      subtle: UI_STYLE.color.main.subtle,
    },
    plain: {
      base: UI_STYLE.color.plain.base,
      ghost: UI_STYLE.color.plain.ghost,
      glass: UI_STYLE.color.plain.glass,
      interactive: UI_STYLE.color.plain.interactive,
      soft: UI_STYLE.color.plain.soft,
      solid: UI_STYLE.color.plain.solid,
      subtle: UI_STYLE.color.plain.subtle,
    },
    warn: {
      base: UI_STYLE.color.warn.base,
      ghost: UI_STYLE.color.warn.ghost,
      glass: UI_STYLE.color.warn.glass,
      interactive: UI_STYLE.color.warn.interactive,
      soft: UI_STYLE.color.warn.soft,
      solid: UI_STYLE.color.warn.solid,
      subtle: UI_STYLE.color.warn.subtle,
    },
    win: {
      base: UI_STYLE.color.win.base,
      ghost: UI_STYLE.color.win.ghost,
      glass: UI_STYLE.color.win.glass,
      interactive: UI_STYLE.color.win.interactive,
      soft: UI_STYLE.color.win.soft,
      solid: UI_STYLE.color.win.solid,
      subtle: UI_STYLE.color.win.subtle,
    },
  }

  const variantClasses = {
    ghost: UI_STYLE.variant.ghost,
    glass: UI_STYLE.variant.glass,
    soft: UI_STYLE.variant.soft,
    solid: UI_STYLE.variant.solid,
    subtle: UI_STYLE.variant.subtle,
  } satisfies Record<ButtonVariant, string>

  const component = computed(() => (props.to === undefined ? 'button' : BaseLink))
  const disabled = computed(() => props.disabled || props.loading)
  const isButton = computed(() => props.to === undefined)
  const classes = computed(() => [
    UI_STYLE.base,
    sizeClasses[props.size],
    colorClasses[props.color].base,
    colorClasses[props.color][props.variant],
    variantClasses[props.variant],
    ['soft', 'solid', 'subtle'].includes(props.variant) && colorClasses[props.color].interactive,
    (props.variant === 'glass' || props.variant === 'solid') && UI_STYLE.effect.surfaceBorder,
    props.block && UI_STYLE.state.block,
    props.square && UI_STYLE.state.square,
    disabled.value && UI_STYLE.state.disabled,
  ])
</script>

<template>
  <component
    :is="component"
    v-bind="$attrs"
    :to="props.to"
    :type="isButton ? props.type : undefined"
    :disabled="isButton ? disabled : undefined"
    :aria-busy="props.loading || undefined"
    :aria-disabled="disabled || undefined"
    :tabindex="disabled && !isButton ? -1 : undefined"
    :class="classes"
    data-testid="brick-button"
  >
    <span
      v-if="props.loading"
      :class="UI_STYLE.slot.loading"
      aria-hidden="true"
    />

    <span
      v-if="$slots.leading"
      :class="UI_STYLE.slot.leading"
    >
      <slot name="leading" />
    </span>

    <span
      v-if="$slots.default"
      :class="UI_STYLE.slot.label"
    >
      <slot />
    </span>

    <span
      v-if="$slots.trailing"
      :class="UI_STYLE.slot.trailing"
    >
      <slot name="trailing" />
    </span>
  </component>
</template>
