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
      class="grid gap-x-2 gap-y-1.5"
      style="grid-template-columns: minmax(0, 24rem) max-content; grid-template-rows: repeat(3, auto)"
    >
      <Input
        :size="size"
        :icon="firstIconName"
        :trailingIcon="firstIconName"
        description="Some text description"
        placeholder="Type here"
        :label="`Size: ${size}`"
        class="row-span-3 grid! grid-rows-subgrid"
        @iconClick="copy"
      />
      <Button
        :size="size"
        class="col-start-2 row-start-2 self-center"
      >
        Button
      </Button>
    </div>
  </div>
</template>
