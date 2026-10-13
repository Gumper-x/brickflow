<script setup lang="ts">
  import { computed, ref, watch } from 'vue'

  import Input from '../Input/index.vue'

  defineOptions({ inheritAttrs: false })

  const props = withDefaults(
    defineProps<{
      description?: string
      label?: string
      max?: number
      min?: number
      onBlur?: (value: null | string, target: HTMLInputElement) => void
      onKeydown?: (event: KeyboardEvent) => void
      onValueChange?: (value: null | number, target: HTMLInputElement) => void
      onValueInput?: (value: null | number, target: HTMLInputElement | null) => void
      step?: number
      value?: null | number
    }>(),
    {
      description: undefined,
      label: undefined,
      max: undefined,
      min: undefined,
      onBlur: undefined,
      onKeydown: undefined,
      onValueChange: undefined,
      onValueInput: undefined,
      step: 1,
      value: undefined,
    },
  )

  const model = defineModel<null | number>({ default: null })
  const rawValue = ref<null | string>(null)
  const currentValue = computed(() => (props.value === undefined ? model.value : props.value))
  const inputValue = computed(
    () => rawValue.value ?? (currentValue.value === null ? '' : String(currentValue.value)),
  )

  function clamp(value: number): number {
    return Math.min(props.max ?? Infinity, Math.max(props.min ?? -Infinity, value))
  }

  let lastInputValue: null | number | undefined
  watch(currentValue, (value) => {
    if (value !== lastInputValue) {
      rawValue.value = null
    }
  })

  function decimalPlaces(value: number): number {
    const [fraction = '', exponent = '0'] = String(value).split(/e/i)
    return Math.max(0, (fraction.split('.')[1]?.length ?? 0) - Number(exponent))
  }

  function handleBlur(value: null | string, target: HTMLInputElement): void {
    rawValue.value = null
    props.onBlur?.(value, target)
  }

  function handleKeydown(event: KeyboardEvent): void {
    props.onKeydown?.(event)

    const target = event.target as HTMLInputElement
    if (
      event.defaultPrevented ||
      target.readOnly ||
      target.disabled ||
      props.step <= 0 ||
      !Number.isFinite(props.step)
    ) {
      return
    }

    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      return
    }

    event.preventDefault()
    const current = toNumber(rawValue.value) ?? currentValue.value ?? 0
    const next = current + (event.key === 'ArrowUp' ? props.step : -props.step)
    const precision = Math.min(12, Math.max(decimalPlaces(current), decimalPlaces(props.step)))
    const value = clamp(Number(next.toFixed(precision)))
    rawValue.value = String(value)
    lastInputValue = value
    model.value = value
    target.value = String(value)
    props.onValueInput?.(value, target)
  }

  function handleValueChange(value: null | string, target: HTMLInputElement): void {
    const parsed = toNumber(value)
    const bounded = parsed === null ? null : clamp(parsed)
    rawValue.value = null
    lastInputValue = bounded
    model.value = bounded
    target.value = bounded === null ? '' : String(bounded)
    props.onValueChange?.(bounded, target)
  }

  function handleValueInput(value: null | string, target: HTMLInputElement | null): void {
    rawValue.value = value ?? ''
    const number = toNumber(value)
    lastInputValue = number
    model.value = number
    props.onValueInput?.(number, target)
  }

  function toNumber(value: null | string): null | number {
    if (value === null || value.trim() === '') {
      return null
    }

    const number = Number(value.replace(',', '.'))
    return Number.isFinite(number) ? number : null
  }
</script>

<template>
  <Input
    v-bind="{
      ...$attrs,
      onValueInput: handleValueInput,
      onValueChange: handleValueChange,
      onBlur: handleBlur,
      onKeydown: handleKeydown,
    }"
    :value="inputValue"
    :label="props.label"
    :description="props.description"
    type="decimal"
  >
    <template
      v-if="$slots.label"
      #label
    >
      <slot name="label" />
    </template>
    <template
      v-if="$slots.left"
      #leading
    >
      <slot name="left" />
    </template>
    <template
      v-if="$slots.right"
      #trailing
    >
      <slot name="right" />
    </template>
    <template
      v-if="$slots.error"
      #error
    >
      <slot name="error" />
    </template>
    <template
      v-if="$slots.description"
      #description
    >
      <slot name="description" />
    </template>
  </Input>
</template>
