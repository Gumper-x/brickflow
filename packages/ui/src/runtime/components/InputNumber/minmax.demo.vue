<script lang="ts">
  export const uiDemo = {
    title: 'Min & Max',
  }
</script>

<script lang="ts" setup>
  import { ref } from 'vue'

  import InputNumber from './index.vue'

  const price1 = ref<number>(25)
  const price2 = ref<number>(-10)
</script>

<template>
  <div class="flex max-w-sm flex-col gap-4">
    <InputNumber
      :value="price1"
      label="Min: 0 — Max: 200"
      :description="`Value: ${price1}`"
      :min="0"
      :max="200"
      @input="price1 = $event"
    >
      <template #leading><span class="text-green-400">$</span></template>
    </InputNumber>
    <InputNumber
      :value="price2"
      label="Min: -100 — Max: 199"
      :description="`Value: ${price2}`"
      :min="-100"
      :max="199"
      @input="price2 = $event"
    >
      <template #leading><span class="text-green-400">$</span></template>
    </InputNumber>
  </div>
</template>
