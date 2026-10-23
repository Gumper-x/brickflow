<script setup lang="ts" generic="T extends boolean = false">
  import { computed, ref, shallowRef, watch } from 'vue'

  import type { Rule } from '../../utils/rules'

  import { isEmpty } from '../../utils/checkup.js'
  import Input from '../Input/index.vue'

  defineOptions({ inheritAttrs: false })

  const props = withDefaults(
    defineProps<{
      align?: InputProps['align']
      autocomplete?: string
      autoWidth?: boolean
      denominator?: number
      description?: string
      disabled?: boolean
      icon?: string
      label?: string
      max?: number
      min?: number
      nullable?: boolean & T
      onBlur?: (value: true extends NoInfer<T> ? null | number : number) => void
      onChange?: (value: string, target: HTMLInputElement) => void
      onFocus?: (value: true extends NoInfer<T> ? null | number : number) => void
      onIconClick?: () => void
      onInput?: (value: true extends NoInfer<T> ? null | number : number) => void
      onKeydown?: (event: KeyboardEvent) => void
      onTrailingIconClick?: () => void
      placeholder?: string
      readonly?: boolean
      rules?: Rule<null | number>[]
      size?: InputProps['size']
      step?: number
      trailingIcon?: string
      value: true extends NoInfer<T> ? null | number : number
      variant?: InputProps['variant']
    }>(),
    {
      align: undefined,
      autocomplete: undefined,
      autoWidth: false,
      denominator: 0,
      description: undefined,
      disabled: false,
      icon: undefined,
      label: undefined,
      max: undefined,
      min: undefined,
      nullable: undefined,
      onBlur: undefined,
      onChange: undefined,
      onFocus: undefined,
      onIconClick: undefined,
      onInput: undefined,
      onKeydown: undefined,
      onTrailingIconClick: undefined,
      placeholder: undefined,
      readonly: false,
      rules: undefined,
      size: undefined,
      step: 1,
      trailingIcon: undefined,
      variant: undefined,
    },
  )

  type InputProps = InstanceType<typeof Input>['$props']

  const inputRef = ref<InstanceType<typeof Input> | null>(null)
  const inputValue = shallowRef(prepareValue(props.value))
  const inputRules = computed(() =>
    props.rules?.map(
      (rule): Rule<string> =>
        (value) =>
          rule(value === '' ? null : Number(value)),
    ),
  )

  defineExpose({ validate: () => inputRef.value?.validate() ?? true })

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

  function handleChange(value: string, target: HTMLInputElement): void {
    props.onChange?.(value, target)
  }

  function handleFocus(): void {
    props.onFocus?.(props.value)
  }

  const allowedRegexp = /^-?\d*(?:\.\d*)?$/
  const validNumberRegexp = /^-?(?:\d+(?:\.\d+)?|\.\d+)$/

  function emitInput(value: typeof props.value): void {
    props.onInput?.(value)
  }

  function handleInput(rawValue: string, target: HTMLInputElement | null): void {
    if (!target) {
      return
    }
    let nextValue = rawValue.replace(/,/, '.')
    target.value = nextValue

    if (isEmpty(nextValue)) {
      if (props.nullable) {
        inputValue.value = ''
        emitInput(null as typeof props.value)
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
        emitInput(null as typeof props.value)
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

    emitInput(nextValueNumber)
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
    emitInput(nextValue)
  }

  function prepareValue(value: typeof props.value): string {
    return value === null ? '' : String(value)
  }
</script>

<template>
  <Input
    ref="inputRef"
    v-bind="{
      ...$attrs,
    }"
    :value="inputValue"
    :align="props.align"
    :autocomplete="props.autocomplete"
    :autoWidth="props.autoWidth"
    :label="props.label"
    :description="props.description"
    :disabled="props.disabled"
    :icon="props.icon"
    :placeholder="props.placeholder"
    :readonly="props.readonly"
    :rules="inputRules"
    :size="props.size"
    :trailingIcon="props.trailingIcon"
    :type="props.denominator === 0 ? 'numeric' : 'decimal'"
    :variant="props.variant"
    @input="handleInput"
    @change="handleChange"
    @blur="handleBlur"
    @focus="handleFocus"
    @iconClick="props.onIconClick?.()"
    @keydown="handleKeydown"
    @trailingIconClick="props.onTrailingIconClick?.()"
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
