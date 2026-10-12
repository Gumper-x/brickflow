<script setup lang="ts">
  import { computed, ref } from 'vue'

  import Input from '../Input/index.vue'

  defineOptions({ inheritAttrs: false })

  const props = withDefaults(
    defineProps<{
      max?: number
      min?: number
      onValueChange?: (value: null | number, target: HTMLInputElement) => void
      onValueInput?: (value: null | number, target: HTMLInputElement | null) => void
      step?: number
      value?: null | number
    }>(),
    {
      max: undefined,
      min: undefined,
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

  function handleBlur(): void {
    rawValue.value = null
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
      return
    }

    event.preventDefault()
    const next = (currentValue.value ?? 0) + (event.key === 'ArrowUp' ? props.step : -props.step)
    const value = clamp(next)
    rawValue.value = String(value)
    model.value = value
    props.onValueInput?.(value, event.target as HTMLInputElement)
  }

  function handleValueChange(value: null | string, target: HTMLInputElement): void {
    const parsed = toNumber(value)
    const bounded = parsed === null ? null : clamp(parsed)
    rawValue.value = null
    model.value = bounded
    props.onValueChange?.(bounded, target)
  }

  function handleValueInput(value: null | string, target: HTMLInputElement | null): void {
    rawValue.value = value ?? ''
    const number = toNumber(value)
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
    type="number"
    :min="props.min"
    :max="props.max"
    :step="props.step"
  >
    <template
      v-if="$slots.label"
      #label
    >
      <slot name="label" />
    </template>
    <template
      v-if="$slots.left"
      #left
    >
      <slot name="left" />
    </template>
    <template
      v-if="$slots.right"
      #right
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
