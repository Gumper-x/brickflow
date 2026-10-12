<script lang="ts">
  export const uiDemo = {
    title: 'Sizes & Icons',
  }
</script>

<script lang="ts" setup>
  import { firstIconName, uiConfig } from '#brickflow-ui'

  import Button from '../Button/index.vue'
  import Input from './index.vue'

  const inputConfig = uiConfig.input

  function copy(): void {
    console.log('Click')
  }
</script>

<template>
  <div class="flex flex-col gap-3">
    <div
      v-for="(_, size) in inputConfig.sizeClasses"
      :key="size"
      class="flex items-end gap-2"
    >
      <Input
        :size="size"
        :icon="firstIconName"
        :trailingIcon="firstIconName"
        placeholder="Type here"
        :label="`Size: ${size}`"
        class="max-w-sm"
        @iconClick="copy"
      />
      <Button
        :size="size"
        class="shrink-0"
      >
        Button
      </Button>
    </div>
  </div>
</template>
