<script lang="ts">
  const UI_CONFIG = defineUiConfig<{
    hidePasswordIconName: string
    searchClearIconName: string
    showPasswordIconName: string
    sizeClasses: Record<
      string,
      {
        description: string
        field: string
        fieldWrap: string
        icon: string
        label: string
      }
    >
    sizeDefault: string
    variantClasses: Record<
      string,
      {
        description: string
        field: string
        fieldWrap: string
        icon: string
        label: string
      }
    >
    variantDefault: string
  }>()

  export type InputConfig = typeof UI_CONFIG
</script>

<script setup lang="ts">
  import type { MaskaDetail, MaskInput, MaskInputOptions, MaskType } from 'maska'

  import { twMerge } from 'tailwind-merge'
  import { computed, nextTick, ref, shallowRef, useAttrs, useId, useSlots, watch } from 'vue'

  import type { Rule } from '../../utils/rules'

  import { useFieldRules } from '../../composables/useFieldRules'
  import Icon from '../Icon/index.vue'
  import TransitionSize from '../TransitionSize/index.vue'

  defineOptions({ inheritAttrs: false })

  const props = withDefaults(
    defineProps<{
      align?: 'center' | 'left' | 'right'
      autocomplete?: string
      autoWidth?: boolean
      description?: string
      disabled?: boolean
      icon?: string
      label?: string
      mask?: MaskInputOptions | MaskType
      onBlur?: (value: string, target: HTMLInputElement) => void
      onChange?: (value: string, target: HTMLInputElement) => void
      onFocus?: (value: string, target: HTMLInputElement | null) => void
      onIconClick?: () => void
      onInput?: (value: string, target: HTMLInputElement | null) => void
      onMask?: (detail: MaskaDetail, target: HTMLInputElement) => void
      onTrailingIconClick?: () => void
      placeholder?: string
      readonly?: boolean
      rules?: Rule<string>[]
      size?: InputSize
      trailingIcon?: string
      type?: 'decimal' | 'email' | 'numeric' | 'password' | 'search' | 'tel' | 'text' | 'url'
      value?: null | string
      variant?: InputVariant
    }>(),
    {
      align: 'left',
      autocomplete: undefined,
      autoWidth: false,
      description: undefined,
      disabled: false,
      icon: undefined,
      label: undefined,
      mask: undefined,
      onBlur: undefined,
      onChange: undefined,
      onFocus: undefined,
      onIconClick: undefined,
      onInput: undefined,
      onMask: undefined,
      onTrailingIconClick: undefined,
      placeholder: '',
      readonly: false,
      rules: undefined,
      size: 'md',
      trailingIcon: undefined,
      type: 'text',
      value: undefined,
      variant: UI_CONFIG.variantDefault,
    },
  )

  const model = shallowRef('')
  const maskedValue = shallowRef<null | string>(null)
  let maskInput: MaskInput | undefined

  const attrs = useAttrs()
  const slots = useSlots()
  const generatedId = useId()
  const baseRef = ref<HTMLInputElement | null>(null)
  const inputRef = ref<HTMLInputElement | null>(null)
  const widthMeasureRef = ref<HTMLSpanElement | null>(null)
  const measuredWidth = ref(0)
  const hasFocus = ref(false)
  const showPassword = ref(false)

  const sizeClasses = UI_CONFIG.sizeClasses
  const variantClasses = UI_CONFIG.variantClasses
  type InputSize = Extract<keyof typeof sizeClasses, string>
  type InputVariant = Extract<keyof typeof variantClasses, string>
  const sizeClass = computed(() => sizeClasses[props.size])
  const variantClass = computed(() => variantClasses[props.variant])

  const fieldId = computed(() => String(attrs.id ?? generatedId))
  const descriptionId = computed(() => `${fieldId.value}-description`)
  const currentValue = computed(() => (props.value === undefined ? model.value : (props.value ?? '')))
  const {
    error,
    input: validateInput,
    validate,
  } = useFieldRules(
    currentValue,
    computed(() => props.rules),
    focus,
  )
  const displayValue = computed(() =>
    props.mask === null || props.mask === undefined
      ? currentValue.value
      : (maskedValue.value ?? currentValue.value),
  )
  const widthMeasureText = computed(() => displayValue.value || props.placeholder || ' ')
  const isEmptyField = computed(() => {
    return Boolean(displayValue.value)
  })

  const hasError = computed(() => Boolean(error.value))
  const hasDescription = computed(() => Boolean(props.description || slots.description || hasError.value))
  const inputType = computed(() => {
    return props.type === 'password' && !showPassword.value ? 'password' : 'text'
  })
  const classes = computed(() => [
    UI_STYLE.base,
    props.autoWidth && UI_STYLE.state.autoWidth,
    props.disabled && UI_STYLE.state.disabled,
  ])
  const fieldWrapClasses = computed(() => [
    twMerge(UI_STYLE.fieldWrap, sizeClass.value.fieldWrap, variantClass.value.fieldWrap),
    props.readonly && UI_STYLE.state.readonly,
  ])
  const fieldClasses = computed(() => [
    twMerge(UI_STYLE.field, sizeClass.value.field, variantClass.value.field),
    props.align === 'center' && UI_STYLE.align.center,
    props.align === 'right' && UI_STYLE.align.right,
    props.autoWidth && UI_STYLE.state.autoWidthField,
  ])
  const labelClasses = computed(() => twMerge(UI_STYLE.label, sizeClass.value.label, variantClass.value.label))
  const descriptionClasses = computed(() =>
    twMerge(
      UI_STYLE.description,
      sizeClass.value.description,
      variantClass.value.description,
      hasError.value && UI_STYLE.state.errorDescription,
    ),
  )
  const leadingIconClasses = computed(() =>
    twMerge(
      UI_STYLE.slot.leading,
      sizeClass.value.icon,
      variantClass.value.icon,
      props.onIconClick && UI_STYLE.slot.hasAction,
    ),
  )
  const trailingIconClasses = computed(() =>
    twMerge(
      UI_STYLE.slot.trailing,
      sizeClass.value.icon,
      variantClass.value.icon,
      props.onTrailingIconClick && UI_STYLE.slot.hasAction,
    ),
  )
  const fieldStyle = computed(() =>
    props.autoWidth ? { flexShrink: 1, maxWidth: '100%', width: `${measuredWidth.value}px` } : { undefined },
  )

  watch(
    [widthMeasureText, () => props.autoWidth, () => props.size, () => props.variant, widthMeasureRef],
    () => {
      if (props.autoWidth && widthMeasureRef.value) {
        measuredWidth.value = Math.ceil(widthMeasureRef.value.getBoundingClientRect().width) + 2
      }
    },
    { flush: 'post', immediate: true },
  )

  watch(
    [() => props.mask, inputRef],
    async ([mask, input], _previous, onCleanup) => {
      maskInput?.destroy()
      maskInput = undefined
      maskedValue.value = null

      if (mask === null || mask === undefined || !input) {
        return
      }

      let canceled = false
      onCleanup(() => {
        canceled = true
        maskInput?.destroy()
        maskInput = undefined
      })

      const { MaskInput } = await import('maska')
      if (canceled) {
        return
      }

      const options: MaskInputOptions = typeof mask === 'object' && !Array.isArray(mask) ? mask : { mask }
      const onMaska = options.onMaska

      maskInput = new MaskInput(input, {
        ...options,
        onMaska: (detail) => {
          maskedValue.value = detail.masked
          model.value = detail.masked
          if (Array.isArray(onMaska)) {
            onMaska.forEach((callback) => callback(detail))
          } else {
            onMaska?.(detail)
          }
          props.onMask?.(detail, input)
        },
      })
    },
    { flush: 'post', immediate: true },
  )

  watch(
    () => props.value,
    async () => {
      if (!maskInput || !inputRef.value) {
        return
      }
      maskedValue.value = null
      await nextTick()
      if (maskInput && inputRef.value) {
        maskInput.updateValue(inputRef.value)
      }
    },
    { flush: 'post' },
  )

  function clear(): void {
    setValue('')
    focus()
  }

  function focus(): void {
    inputRef.value?.focus()
  }

  function handleBlur(event: FocusEvent): void {
    hasFocus.value = false
    props.onBlur?.(currentValue.value, event.target as HTMLInputElement)
  }

  function handleChange(event: Event): void {
    const target = event.target as HTMLInputElement
    props.onChange?.(target.value, target)
  }

  function handleFocus(event: FocusEvent): void {
    hasFocus.value = true
    props.onFocus?.(currentValue.value, event.target as HTMLInputElement)
  }

  function handleInput(event: Event): void {
    if (props.mask !== null && props.mask !== undefined && event instanceof CustomEvent) {
      return
    }
    setValue((event.target as HTMLInputElement).value)
  }

  function setValue(value: string): void {
    model.value = value
    validateInput(value)
    if (props.mask !== null && props.mask !== undefined) {
      maskedValue.value = value
    }
    props.onInput?.(value, inputRef.value)
  }

  defineExpose({ clear, fieldId, focus, hasFocus, inputRef, validate })
</script>

<template>
  <div
    ref="baseRef"
    :class="[classes, $attrs.class]"
  >
    <TransitionSize
      :flexParent="baseRef"
      flexDirection="end"
    >
      <label
        v-if="props.label || $slots.label"
        :for="fieldId"
        :class="labelClasses"
      >
        <slot name="label">{{ props.label }}</slot>
      </label>
    </TransitionSize>

    <label
      :for="fieldId"
      :class="fieldWrapClasses"
      :aria-invalid="hasError ? 'true' : undefined"
      :style="props.autoWidth ? { maxWidth: '100%', width: 'fit-content' } : undefined"
    >
      <span
        v-if="props.autoWidth"
        ref="widthMeasureRef"
        aria-hidden="true"
        :class="[fieldClasses, 'pointer-events-none invisible absolute w-max whitespace-pre']"
      >
        {{ widthMeasureText }}
      </span>
      <slot name="leading">
        <component
          :is="props.onIconClick ? 'button' : 'label'"
          v-if="props.icon"
          type="button"
          :for="fieldId"
          :disabled="props.disabled || !props.onIconClick"
          :class="leadingIconClasses"
          @click="props.onIconClick?.()"
        >
          <Icon
            :name="props.icon"
            aria-hidden="true"
          />
        </component>
      </slot>

      <input
        v-bind="{ ...$attrs, class: undefined, id: undefined }"
        :id="fieldId"
        ref="inputRef"
        :value="displayValue"
        :type="inputType"
        :inputmode="props.type === 'password' ? undefined : props.type"
        :autocomplete="props.autocomplete"
        :disabled="props.disabled"
        :readonly="props.readonly"
        :placeholder="props.placeholder"
        :aria-describedby="hasDescription ? descriptionId : undefined"
        :aria-invalid="hasError ? 'true' : undefined"
        :class="fieldClasses"
        :style="fieldStyle"
        @input="handleInput"
        @change="handleChange"
        @focus="handleFocus"
        @blur="handleBlur"
      />

      <button
        v-if="props.type === 'password'"
        type="button"
        :disabled="props.disabled"
        :class="[trailingIconClasses, UI_STYLE.slot.hasAction]"
        :aria-label="showPassword ? 'Hide password' : 'Show password'"
        @click="showPassword = !showPassword"
      >
        <Icon
          :name="showPassword ? UI_CONFIG.hidePasswordIconName : UI_CONFIG.showPasswordIconName"
          aria-hidden="true"
        />
      </button>
      <button
        v-else-if="props.type === 'search' && isEmptyField"
        type="button"
        :disabled="props.disabled || props.readonly"
        :class="[trailingIconClasses, UI_STYLE.slot.hasAction]"
        aria-label="Clear search"
        @click="clear"
      >
        <Icon
          :name="UI_CONFIG.searchClearIconName"
          aria-hidden="true"
        />
      </button>
      <slot
        v-else
        name="trailing"
      >
        <component
          :is="props.onTrailingIconClick ? 'button' : 'label'"
          v-if="props.trailingIcon"
          type="button"
          :for="fieldId"
          :disabled="props.disabled || !props.onTrailingIconClick"
          :class="trailingIconClasses"
          @click="props.onTrailingIconClick?.()"
        >
          <Icon
            :name="props.trailingIcon"
            aria-hidden="true"
          />
        </component>
      </slot>
    </label>

    <TransitionSize :flexParent="baseRef">
      <div
        v-if="hasDescription"
        :id="descriptionId"
        :class="descriptionClasses"
      >
        <slot
          v-if="hasError"
          name="error"
        >
          {{ error }}
        </slot>
        <slot
          v-else
          name="description"
        >
          {{ props.description }}
        </slot>
      </div>
    </TransitionSize>
  </div>
</template>
