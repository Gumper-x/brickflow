<script lang="ts">
  export const uiDemo = {
    title: 'Number & Bounds',
  }
</script>

<script lang="ts" setup>
  import { ref } from 'vue'

  import InputNumber from './index.vue'

  const quantity = ref<null | number>(null)
  const price = ref<null | number>(25)
</script>

<template>
  <div class="flex max-w-sm flex-col gap-4">
    <InputNumber
      v-model="quantity"
      label="Quantity"
      description="Use ↑ and ↓ to change by one."
      :min="0"
      :max="20"
      block
    />
    <InputNumber
      v-model="price"
      label="Price"
      description="Changes in steps of five."
      :min="0"
      :max="100"
      :step="5"
      block
    />
    <p class="text-sm text-gray-400">Quantity: {{ quantity ?? '—' }} · Price: {{ price ?? '—' }}</p>
  </div>
</template>
