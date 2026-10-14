<script lang="ts">
  export const uiDemo = {
    title: 'Nullable',
  }
</script>

<script lang="ts" setup>
  import { ref } from 'vue'

  import InputNumber from './index.vue'

  const value = ref<null | number>(null)
</script>

<template>
  <div class="flex max-w-sm flex-col gap-4">
    <InputNumber
      :value="value"
      nullable
      label="Nullable (clear to set null)"
      :description="`Value: ${value === null ? 'null' : value}`"
      @input="value = $event"
    />
  </div>
</template>
