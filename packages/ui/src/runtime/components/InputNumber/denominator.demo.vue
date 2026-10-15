<script lang="ts">
  export const uiDemo = {
    description: 'Denominator limits decimal places: 0 for integers, 2 for up to two decimal digits.',
    title: 'Denominator',
  }
</script>

<script lang="ts" setup>
  import { ref } from 'vue'

  import InputNumber from './index.vue'

  const price = ref<number>(8)
  const price2 = ref<number>(12.55)
</script>

<template>
  <div class="flex max-w-sm flex-col gap-4">
    <InputNumber
      :value="price"
      :denominator="0"
      label="Denominator: 0"
      :description="`Value: ${price}`"
      :min="-99"
      :max="200"
      @input="price = $event"
    ></InputNumber>
    <InputNumber
      :value="price2"
      :denominator="2"
      label="Denominator: 2"
      :description="`Value: ${price2}`"
      :min="-99"
      :max="200"
      @input="price2 = $event"
    ></InputNumber>
  </div>
</template>
