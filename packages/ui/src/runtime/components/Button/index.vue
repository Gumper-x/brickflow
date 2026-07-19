<script setup lang="ts">
  import type { RouteLocationRaw } from 'vue-router'

  import { computed, shallowRef } from 'vue'

  import Icon from '../Icon/index.vue'
  import BaseLink from '../Link/index.vue'

  const props = withDefaults(
    defineProps<{
      block?: boolean
      color?: ButtonColor
      disabled?: boolean
      icon?: string
      loading?: boolean
      rounded?: boolean
      size?: ButtonSize
      square?: boolean
      to?: RouteLocationRaw
      trailingIcon?: string
      type?: 'button' | 'reset' | 'submit'
      variant?: ButtonVariant
    }>(),
    {
      color: 'main',
      icon: undefined,
      rounded: false,
      size: 'md',
      to: undefined,
      trailingIcon: undefined,
      type: 'button',
      variant: 'solid',
    },
  )
  type ButtonColor = 'alt' | 'danger' | 'info' | 'main' | 'plain' | 'warn' | 'win'
  type ButtonSize = 'lg' | 'md' | 'sm' | 'xl' | 'xs'
  type ButtonVariant = 'ghost' | 'glass' | 'soft' | 'solid' | 'subtle'

  const sizeClasses = {
    lg: UI_STYLE.size.lg,
    md: UI_STYLE.size.md,
    sm: UI_STYLE.size.sm,
    xl: UI_STYLE.size.xl,
    xs: UI_STYLE.size.xs,
  } satisfies Record<ButtonSize, string>
  const sizeIconClasses = {
    lg: UI_STYLE.size.lgIcon,
    md: UI_STYLE.size.mdIcon,
    sm: UI_STYLE.size.smIcon,
    xl: UI_STYLE.size.xlIcon,
    xs: UI_STYLE.size.xsIcon,
  } satisfies Record<ButtonSize, string>

  const colorClasses = {
    alt: {
      ghost: UI_STYLE.color.alt.ghost,
      glass: UI_STYLE.color.alt.glass,
      soft: UI_STYLE.color.alt.soft,
      solid: UI_STYLE.color.alt.solid,
      subtle: UI_STYLE.color.alt.subtle,
    },
    danger: {
      ghost: UI_STYLE.color.danger.ghost,
      glass: UI_STYLE.color.danger.glass,
      soft: UI_STYLE.color.danger.soft,
      solid: UI_STYLE.color.danger.solid,
      subtle: UI_STYLE.color.danger.subtle,
    },
    info: {
      ghost: UI_STYLE.color.info.ghost,
      glass: UI_STYLE.color.info.glass,
      soft: UI_STYLE.color.info.soft,
      solid: UI_STYLE.color.info.solid,
      subtle: UI_STYLE.color.info.subtle,
    },
    main: {
      ghost: UI_STYLE.color.main.ghost,
      glass: UI_STYLE.color.main.glass,
      soft: UI_STYLE.color.main.soft,
      solid: UI_STYLE.color.main.solid,
      subtle: UI_STYLE.color.main.subtle,
    },
    plain: {
      ghost: UI_STYLE.color.plain.ghost,
      glass: UI_STYLE.color.plain.glass,
      soft: UI_STYLE.color.plain.soft,
      solid: UI_STYLE.color.plain.solid,
      subtle: UI_STYLE.color.plain.subtle,
    },
    warn: {
      ghost: UI_STYLE.color.warn.ghost,
      glass: UI_STYLE.color.warn.glass,
      soft: UI_STYLE.color.warn.soft,
      solid: UI_STYLE.color.warn.solid,
      subtle: UI_STYLE.color.warn.subtle,
    },
    win: {
      ghost: UI_STYLE.color.win.ghost,
      glass: UI_STYLE.color.win.glass,
      soft: UI_STYLE.color.win.soft,
      solid: UI_STYLE.color.win.solid,
      subtle: UI_STYLE.color.win.subtle,
    },
  }

  const component = computed(() => (props.to === undefined ? 'button' : BaseLink))
  const disabled = computed(() => props.disabled || props.loading)
  const isButton = computed(() => props.to === undefined)
  const classes = computed(() => [
    UI_STYLE.base,
    sizeClasses[props.size],
    colorClasses[props.color][props.variant],
    props.block && UI_STYLE.state.block,
    props.square && UI_STYLE.state.square,
    disabled.value && UI_STYLE.state.disabled,
  ])

  const isAnimating = shallowRef(false)
  const animationTapClass = UI_STYLE.animationTap
  function handleTap(): void {
    isAnimating.value = false

    requestAnimationFrame(() => {
      isAnimating.value = true
    })
  }
</script>

<template>
  <component
    :is="component"
    v-bind="animationTapClass ? { onPointerupPassive: handleTap } : {}"
    :to="props.to"
    :type="isButton ? props.type : undefined"
    :disabled="isButton ? disabled : undefined"
    :aria-busy="props.loading || undefined"
    :aria-disabled="disabled || undefined"
    :tabindex="disabled && !isButton ? -1 : undefined"
    :class="[classes, isAnimating && animationTapClass]"
    data-testid="ui-button"
    :style="{
      borderRadius: props.rounded && '99999px',
    }"
    @contextmenu.prevent
  >
    <span
      v-if="$slots.leading || props.icon || props.loading"
      :class="UI_STYLE.slot.leading"
    >
      <slot name="leading">
        <Icon
          v-if="props.loading"
          :name="UI_STYLE.state.loadingIconName"
          :class="UI_STYLE.state.loading"
          aria-hidden="true"
        />
        <Icon
          v-else
          :name="props.icon!"
          :class="sizeIconClasses[props.size]"
          aria-hidden="true"
        />
      </slot>
    </span>

    <span
      v-if="$slots.default"
      :class="UI_STYLE.slot.label"
    >
      <slot />
    </span>

    <span
      v-if="$slots.trailing || props.trailingIcon"
      :class="UI_STYLE.slot.trailing"
    >
      <slot name="trailing">
        <Icon
          :name="props.trailingIcon!"
          :class="sizeIconClasses[props.size]"
          aria-hidden="true"
        />
      </slot>
    </span>
  </component>
</template>
