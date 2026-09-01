<script lang="ts">
  export const uiDemo = {
    title: 'Size & Rounded',
  }
</script>

<script lang="ts" setup>
  import { firstIconName } from '#brickflow-ui-icons'

  import Button from './index.vue'
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <Button
        :icon="firstIconName"
        size="xs"
      >
        Button
      </Button>
      <Button
        :icon="firstIconName"
        size="sm"
      >
        Button
      </Button>
      <Button :icon="firstIconName">Button</Button>
      <Button
        :icon="firstIconName"
        size="lg"
      >
        Button
      </Button>
      <Button
        :icon="firstIconName"
        size="xl"
      >
        Button
      </Button>
    </div>
    <div class="flex flex-wrap items-center gap-3">
      <Button
        :icon="firstIconName"
        size="xs"
        rounded
      >
        Button
      </Button>
      <Button
        :icon="firstIconName"
        size="sm"
        rounded
      >
        Button
      </Button>
      <Button
        :icon="firstIconName"
        rounded
      >
        Button
      </Button>
      <Button
        :icon="firstIconName"
        size="lg"
        rounded
      >
        Button
      </Button>
      <Button
        :icon="firstIconName"
        size="xl"
        rounded
      >
        Button
      </Button>
    </div>
  </div>
</template>
