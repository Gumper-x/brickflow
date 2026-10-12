<script lang="ts">
  export const uiDemo = {
    title: 'Variants & Disabled',
  }
</script>

<script lang="ts" setup>
  import { uiConfig } from '#brickflow-ui'

  import Input from './index.vue'

  const inputConfig = uiConfig.input
</script>

<template>
  <div class="flex max-w-sm flex-col gap-4">
    <div
      v-for="(_, variant) in inputConfig.variantClasses"
      :key="variant"
      class="flex flex-col gap-3"
    >
      <Input
        :variant="variant"
        :label="`Variant ${variant}`"
        placeholder="Type here"
      />
      <Input
        :variant="variant"
        :label="`Disabled ${variant}`"
        value="Unavailable"
        disabled
      />
    </div>
  </div>
</template>
