<script lang="ts">
  const UI_CONFIG = defineUiConfig<{
    colorClasses: Record<string, Record<string, string>>
    colorDefault: string
    loadingIconName: string
    sizeClasses: Record<string, string>
    sizeDefault: string
    variantDefault: string
  }>()
</script>

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
      color: UI_CONFIG.colorDefault,
      icon: undefined,
      rounded: false,
      size: UI_CONFIG.sizeDefault,
      to: undefined,
      trailingIcon: undefined,
      type: 'button',
      variant: UI_CONFIG.variantDefault,
    },
  )

  const colorClasses = UI_CONFIG.colorClasses
  const sizeClasses = UI_CONFIG.sizeClasses
  type ButtonColor = Extract<keyof typeof colorClasses, string>
  type ButtonSize = Extract<keyof typeof sizeClasses, string>
  type ButtonVariant = Extract<keyof (typeof colorClasses)[ButtonColor], string>

  const sizeIconClasses = {
    lg: UI_STYLE.size.lgIcon,
    md: UI_STYLE.size.mdIcon,
    sm: UI_STYLE.size.smIcon,
    xl: UI_STYLE.size.xlIcon,
    xs: UI_STYLE.size.xsIcon,
  } as const

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
          :name="UI_CONFIG.loadingIconName"
          :class="UI_STYLE.state.loading"
          aria-hidden="true"
        />
        <Icon
          v-else
          :name="props.icon!"
          :class="sizeIconClasses[props.size as keyof typeof sizeIconClasses]"
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
          :class="sizeIconClasses[props.size as keyof typeof sizeIconClasses]"
          aria-hidden="true"
        />
      </slot>
    </span>
  </component>
</template>
