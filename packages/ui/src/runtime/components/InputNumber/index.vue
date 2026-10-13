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
      nullable?: T
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
    const nextValue = rawValue.replace(/,/, '.')
    target.value = nextValue

    if (isEmpty(nextValue)) {
      return
    }
    if (!allowedRegexp.test(nextValue)) {
      target.value = inputValue.value
      return
    }
    if (!validNumberRegexp.test(nextValue)) {
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
  function prepareValue(value: typeof props.value): string {
    return value === null ? '' : String(value)
  }
</script>

<template>
  <Input
    v-bind="{
      ...$attrs,
      // onBlur: handleBlur,
      // onKeydown: handleKeydown,
    }"
    :value="inputValue"
    :label="props.label"
    :description="props.description"
    type="decimal"
    @input="handleInput"
    @blur="handleBlur"
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
