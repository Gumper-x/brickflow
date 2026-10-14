<script lang="ts">
  export const uiDemo = {
    description: 'Step sets the change per arrow key press. Hold Shift to double it.',
    title: 'Step',
  }
</script>

<script lang="ts" setup>
  import { ref } from 'vue'

  import InputNumber from './index.vue'

  const quantity = ref<number>(2)
  const price = ref<number>(25)
</script>

<template>
  <div class="flex max-w-sm flex-col gap-4">
    <InputNumber
      :value="quantity"
      :step="1"
      label="Step: 1"
      :min="0"
      :max="200"
      :description="`Value: ${quantity}`"
      @input="quantity = $event"
    />
    <InputNumber
      :value="price"
      :step="5"
      label="Step: 5"
      :min="-10"
      :max="200"
      :description="`Value: ${price}`"
      @input="price = $event"
    />
  </div>
</template>
