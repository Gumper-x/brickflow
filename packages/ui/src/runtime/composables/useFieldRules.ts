import { computed, inject, type InjectionKey, onUnmounted, type Ref, shallowRef, watch } from 'vue'

import type { Rule } from '../utils/rules'

import { useBrickflow } from './useBrickflow'

export interface FormRulesContext {
  register: (field: { focus: () => void; validate: () => boolean }) => () => void
}

export const formRulesKey: InjectionKey<FormRulesContext> = Symbol('brickflow-form-rules')

export interface FieldRulesState {
  error: Readonly<Ref<string>>
  input: (value: unknown) => void
  validate: () => boolean
}

export function useFieldRules<T>(
  value: Ref<T>,
  rules: Ref<Rule<T>[] | undefined>,
  focus: () => void,
): FieldRulesState {
  const config = useBrickflow()
  const form = inject(formRulesKey, undefined)
  const error = shallowRef('')
  const active = shallowRef(false)

  function check(nextValue: T): boolean {
    for (const rule of rules.value ?? []) {
      const result = rule(nextValue)
      if (result !== true) {
        error.value = result
        return false
      }
    }
    error.value = ''
    return true
  }

  function validate(): boolean {
    active.value = true
    return check(value.value)
  }

  function input(nextValue: unknown): void {
    if (active.value) {
      check(nextValue as T)
    }
  }

  watch(value, () => {
    if (active.value) {
      check(value.value)
    }
  })

  watch([rules, () => config.i18n?.locale.value], () => {
    if (active.value) {
      check(value.value)
    }
  })

  const unregister = form?.register({ focus, validate })
  onUnmounted(() => unregister?.())

  return { error: computed(() => error.value), input, validate }
}
