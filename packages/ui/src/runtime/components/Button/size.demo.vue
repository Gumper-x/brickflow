<script lang="ts">
  export const uiDemo = {
    title: 'Size & Rounded',
  }
</script>

<script lang="ts" setup>
  import { buttonConfig, firstIconName } from '#brickflow-ui-icons'

  import Button from './index.vue'
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <div
        v-for="(_, size) in buttonConfig.sizeClasses"
        :key="size"
        class="flex flex-col items-center gap-1"
      >
        <span class="text-xs text-zinc-500">{{ size }}</span>
        <Button
          :icon="firstIconName"
          :size="size"
        >
          Button
        </Button>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-3">
      <div
        v-for="(_, size) in buttonConfig.sizeClasses"
        :key="size"
        class="flex flex-col items-center gap-1"
      >
        <span class="text-xs text-zinc-500">{{ size }}</span>
        <Button
          :icon="firstIconName"
          :size="size"
          rounded
        >
          Button
        </Button>
      </div>
    </div>
  </div>
</template>
