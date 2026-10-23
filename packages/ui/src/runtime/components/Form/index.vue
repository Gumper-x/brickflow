<script setup lang="ts">
  import { provide } from 'vue'

  import { formRulesKey } from '../../composables/useFieldRules'

  const props = defineProps<{
    onInvalid?: (event: SubmitEvent) => void
    onSubmit?: (event: SubmitEvent) => void
  }>()

  const fields = new Set<{ focus: () => void; validate: () => boolean }>()
  provide(formRulesKey, {
    register(field: { focus: () => void; validate: () => boolean }) {
      fields.add(field)
      return () => fields.delete(field)
    },
  })

  function handleSubmit(event: SubmitEvent): void {
    event.preventDefault()
    if (validate()) {
      props.onSubmit?.(event)
    } else {
      props.onInvalid?.(event)
    }
  }

  function validate(): boolean {
    let firstInvalid: undefined | { focus: () => void }
    for (const field of fields) {
      if (!field.validate() && !firstInvalid) {
        firstInvalid = field
      }
    }
    firstInvalid?.focus()
    return !firstInvalid
  }

  defineExpose({ validate })
</script>

<template>
  <form
    class="flex flex-col gap-4"
    novalidate
    @submit="handleSubmit"
  >
    <slot />
  </form>
</template>
