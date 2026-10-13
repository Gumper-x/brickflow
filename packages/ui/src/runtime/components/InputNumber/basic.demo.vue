<script lang="ts">
  export const uiDemo = {
    title: 'Number & Bounds',
  }
</script>

<script lang="ts" setup>
  import { ref } from 'vue'

  import InputNumber from './index.vue'

  const price = ref<number>(25)
  function handleInput(event: number): void {
    price.value = event
  }
</script>

<template>
  <div class="flex max-w-sm flex-col gap-4">
    <InputNumber
      :value="price"
      label="Price"
      description="Min: 0 — Max: 200"
      :min="0"
      :max="200"
      :step="5"
      @input="handleInput"
    >
      <template #leading><span class="text-green-400">$</span></template>
    </InputNumber>
    <p class="text-gray-500">Value: {{ price }}</p>
  </div>
</template>
