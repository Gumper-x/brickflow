<script lang="ts">
  import type { IconName } from '#brickflow-ui'

  const UI_CONFIG = defineUiConfig<{
    colorClasses: Record<string, Record<string, string>>
    colorDefault: string
    loadingIconName: IconName
    loadingIconTransition: string
    sizeClasses: Record<string, string>
    sizeDefault: string
    sizeIconClasses: Record<string, string>
    variantDefault: string
  }>()

  export type ButtonConfig = typeof UI_CONFIG
</script>

<script setup lang="ts">
  import type { RouteLocationRaw } from 'vue-router'

  import { twMerge } from 'tailwind-merge'
  import { computed, shallowRef } from 'vue'

  import Icon from '../Icon/index.vue'
  import BaseLink from '../Link/index.vue'
  import TransitionSize from '../TransitionSize/index.vue'

  const props = withDefaults(
    defineProps<{
      block?: boolean
      color?: ButtonColor
      disabled?: boolean
      icon?: IconName
      loading?: boolean
      rounded?: boolean
      size?: ButtonSize
      square?: boolean
      target?: '_blank' | '_parent' | '_self' | '_top' | null | (Record<string, never> & string)
      to?: RouteLocationRaw
      trailingIcon?: IconName
      type?: 'button' | 'reset' | 'submit'
      variant?: ButtonVariant
    }>(),
    {
      color: UI_CONFIG.colorDefault,
      icon: undefined,
      rounded: false,
      size: UI_CONFIG.sizeDefault,
      target: undefined,
      to: undefined,
      trailingIcon: undefined,
      type: 'button',
      variant: UI_CONFIG.variantDefault,
    },
  )

  const colorClasses = UI_CONFIG.colorClasses
  const sizeClasses = UI_CONFIG.sizeClasses
  const sizeIconClasses = UI_CONFIG.sizeIconClasses
  type ButtonColor = Extract<keyof typeof colorClasses, string>
  type ButtonSize = Extract<keyof typeof sizeClasses, string>
  type ButtonVariant = Extract<keyof (typeof colorClasses)[ButtonColor], string>

  const baseRef = shallowRef()

  const isButton = computed(() => props.to === undefined)
  const component = computed(() => (isButton.value ? 'button' : BaseLink))
  const disabled = computed(() => props.disabled || props.loading)
  const classes = computed(() => [
    UI_STYLE.base,
    twMerge(sizeClasses[props.size], props.square && UI_STYLE.state.square),
    colorClasses[props.color][props.variant],
    props.block && UI_STYLE.state.block,
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
    ref="baseRef"
    v-bind="animationTapClass ? { onPointerupPassive: handleTap } : {}"
    :to="props.to"
    :target="isButton ? undefined : props.target"
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
    <TransitionSize
      v-if="!$slots.leading && !props.icon && !props.trailingIcon"
      dimension="width"
      :flexParent="baseRef?.$el || baseRef"
      flexDirection="start"
    >
      <span v-if="props.loading">
        <Icon
          :name="UI_CONFIG.loadingIconName"
          :class="[UI_STYLE.state.loading, sizeIconClasses[props.size]]"
          aria-hidden="true"
        />
      </span>
    </TransitionSize>

    <Transition
      v-if="$slots.leading || props.icon"
      :name="UI_CONFIG.loadingIconTransition"
      mode="out-in"
    >
      <span v-if="props.loading">
        <Icon
          :name="UI_CONFIG.loadingIconName"
          :class="[UI_STYLE.state.loading, sizeIconClasses[props.size]]"
          aria-hidden="true"
        />
      </span>
      <span
        v-else
        :class="UI_STYLE.slot.leading"
      >
        <slot name="leading">
          <Icon
            :name="props.icon!"
            :class="sizeIconClasses[props.size]"
            aria-hidden="true"
          />
        </slot>
      </span>
    </Transition>

    <span
      v-if="$slots.default"
      :class="UI_STYLE.slot.label"
    >
      <slot />
    </span>

    <Transition
      v-if="$slots.trailing || props.trailingIcon"
      :name="UI_CONFIG.loadingIconTransition"
      mode="out-in"
    >
      <span v-if="props.loading && !props.icon">
        <Icon
          :name="UI_CONFIG.loadingIconName"
          :class="[UI_STYLE.state.loading, sizeIconClasses[props.size]]"
          aria-hidden="true"
        />
      </span>
      <span
        v-else
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
    </Transition>
  </component>
</template>
