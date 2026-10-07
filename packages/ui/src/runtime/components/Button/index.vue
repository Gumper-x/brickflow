<script lang="ts">
  const UI_CONFIG = defineUiConfig<{
    colorClasses: Record<string, Record<string, string>>
    colorDefault: string
    loadingContentTransition: string
    loadingIconName: string
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
  import { computed, shallowRef, watch } from 'vue'

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
      target?: '_blank' | '_parent' | '_self' | '_top' | null | (Record<string, never> & string)
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

  const loadingState = shallowRef<'appear' | 'disappear' | undefined>(props.loading ? 'disappear' : undefined)
  const loadingTransition = shallowRef<'appear' | 'disappear'>()
  const loadingContentClasses = computed(() => {
    return [
      loadingState.value === 'appear' && `${UI_CONFIG.loadingContentTransition}-leave-to`,
      loadingState.value === 'disappear' && `${UI_CONFIG.loadingContentTransition}-enter-from`,
      loadingTransition.value === 'appear' && `${UI_CONFIG.loadingContentTransition}-leave-active`,
      loadingTransition.value === 'disappear' && `${UI_CONFIG.loadingContentTransition}-enter-active`,
    ]
  })
  function loadingTransitionAfterLeave(): void {
    loadingTransition.value = undefined
    loadingState.value = undefined
  }
  watch(
    () => props.loading,
    () => {
      loadingTransition.value = props.loading ? 'appear' : 'disappear'
    },
  )

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
    <span
      v-if="$slots.leading || props.icon"
      :class="[UI_STYLE.slot.leading, loadingContentClasses]"
    >
      <slot name="leading">
        <Icon
          :name="props.icon!"
          :class="sizeIconClasses[props.size]"
          aria-hidden="true"
        />
      </slot>
    </span>

    <span
      v-if="$slots.default"
      :class="[UI_STYLE.slot.label, loadingContentClasses]"
    >
      <slot />
    </span>

    <span
      v-if="$slots.trailing || props.trailingIcon"
      :class="[UI_STYLE.slot.trailing, loadingContentClasses]"
    >
      <slot name="trailing">
        <Icon
          :name="props.trailingIcon!"
          :class="sizeIconClasses[props.size]"
          aria-hidden="true"
        />
      </slot>
    </span>

    <Transition
      :name="UI_CONFIG.loadingIconTransition"
      mode="out-in"
      @enter="loadingState = 'appear'"
      @afterEnter="loadingState = 'disappear'"
      @leave="loadingState = undefined"
      @afterLeave="loadingTransitionAfterLeave"
    >
      <span
        v-if="props.loading"
        :style="{ position: 'absolute', top: '50%', left: '50%', translate: '-50% -50%' }"
      >
        <Icon
          :name="UI_CONFIG.loadingIconName"
          :class="[UI_STYLE.state.loading, sizeIconClasses[props.size]]"
          aria-hidden="true"
        />
      </span>
    </Transition>
  </component>
</template>
