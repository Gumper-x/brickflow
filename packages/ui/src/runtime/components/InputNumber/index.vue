<script setup lang="ts" generic="T extends boolean = false">
  import { shallowRef, watch } from 'vue'

  import { isEmpty } from '../../utils/checkup.js'
  import Input from '../Input/index.vue'

  defineOptions({ inheritAttrs: false })

  const props = withDefaults(
    defineProps<{
      denominator?: number
      description?: string
      disabled?: boolean
      label?: string
      max?: number
      min?: number
      nullable?: boolean & T
      onBlur?: (value: true extends NoInfer<T> ? null | number : number) => void
      onFocus?: (value: true extends NoInfer<T> ? null | number : number) => void
      onInput?: (value: true extends NoInfer<T> ? null | number : number) => void
      onKeydown?: (event: KeyboardEvent) => void
      step?: number
      value: true extends NoInfer<T> ? null | number : number
    }>(),
    {
      denominator: 0,
      description: undefined,
      disabled: false,
      label: undefined,
      max: undefined,
      min: undefined,
      nullable: undefined,
      onBlur: undefined,
      onFocus: undefined,
      onInput: undefined,
      onKeydown: undefined,
      onValueChange: undefined,
      step: 1,
    },
  )

  const inputValue = shallowRef(prepareValue(props.value))

  watch(
    () => props.value,
    () => {
      inputValue.value = prepareValue(props.value)
    },
  )

  function handleBlur(value: string, target: HTMLInputElement): void {
    if (!target) {
      return
    }
    if (props.nullable && target.value === '') {
      inputValue.value = ''
      props.onBlur?.(null as typeof props.value)
      return
    }
    const nextValue = prepareValue(props.value)
    target.value = nextValue
    inputValue.value = nextValue
    props.onBlur?.(props.value)
  }
  const allowedRegexp = /^-?\d*(?:\.\d*)?$/
  const validNumberRegexp = /^-?(?:\d+(?:\.\d+)?|\.\d+)$/

  function handleInput(rawValue: string, target: HTMLInputElement | null): void {
    if (!target) {
      return
    }
    let nextValue = rawValue.replace(/,/, '.')
    target.value = nextValue

    if (isEmpty(nextValue)) {
      if (props.nullable) {
        inputValue.value = ''
        props.onInput?.(null as typeof props.value)
      }
      return
    }
    if (!allowedRegexp.test(nextValue)) {
      target.value = inputValue.value
      return
    }
    const fraction = nextValue.split('.')[1]
    if (fraction !== undefined && (props.denominator === 0 || fraction.length > props.denominator)) {
      nextValue =
        props.denominator === 0
          ? nextValue.slice(0, nextValue.indexOf('.'))
          : nextValue.slice(0, nextValue.indexOf('.') + props.denominator + 1)
      target.value = nextValue
    }
    if (isEmpty(nextValue) || !validNumberRegexp.test(nextValue)) {
      if (isEmpty(nextValue) && props.nullable) {
        inputValue.value = ''
        props.onInput?.(null as typeof props.value)
      }
      return
    }

    let nextValueNumber = Number(nextValue)
    if (!isEmpty(props.min) && nextValueNumber < props.min) {
      target.value = prepareValue(props.min)
      nextValueNumber = props.min
    }
    if (!isEmpty(props.max) && nextValueNumber > props.max) {
      target.value = prepareValue(props.max)
      nextValueNumber = props.max
    }

    props.onInput?.(nextValueNumber)
  }

  function handleKeydown(event: KeyboardEvent): void {
    props.onKeydown?.(event)
    if (event.defaultPrevented || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) {
      return
    }
    const target = event.target
    if (!(target instanceof HTMLInputElement) || target.disabled || target.readOnly) {
      return
    }
    if (!Number.isFinite(props.step) || props.step <= 0) {
      return
    }

    event.preventDefault()
    const parsedValue = Number(target.value)
    const currentValue = target.value !== '' && Number.isFinite(parsedValue) ? parsedValue : (props.value ?? 0)
    const direction = event.key === 'ArrowUp' ? 1 : -1
    const step = props.step * (event.shiftKey ? 2 : 1)
    const precision = Math.max(0, Math.min(100, Math.trunc(props.denominator)))
    let nextValue = Number((currentValue + direction * step).toFixed(precision))
    if (!isEmpty(props.min) && nextValue < props.min) {
      nextValue = props.min
    }
    if (!isEmpty(props.max) && nextValue > props.max) {
      nextValue = props.max
    }

    target.value = prepareValue(nextValue)
    props.onInput?.(nextValue)
  }

  function prepareValue(value: typeof props.value): string {
    return value === null ? '' : String(value)
  }
</script>

<template>
  <Input
    v-bind="{
      ...$attrs,
    }"
    :value="inputValue"
    :label="props.label"
    :description="props.description"
    :type="props.denominator === 0 ? 'numeric' : 'decimal'"
    @input="handleInput"
    @blur="handleBlur"
    @keydown="handleKeydown"
  >
    <template
      v-if="$slots.label"
      #label
    >
      <slot name="label" />
    </template>
    <template
      v-if="$slots.leading"
      #leading
    >
      <slot name="leading" />
    </template>
    <template
      v-if="$slots.trailing"
      #trailing
    >
      <slot name="trailing" />
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
