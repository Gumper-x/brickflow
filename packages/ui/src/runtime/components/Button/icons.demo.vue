<script lang="ts">
  export const uiDemo = {
    description: 'Set leadingIcon and trailingIcon to an icon name. Slots take precedence when both are provided.',
    title: 'Icons',
  }
</script>

<script lang="ts" setup>
  import { firstIconName } from '#brickflow-ui-icons'

  import Button from './index.vue'
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <Button :icon="firstIconName">Launch</Button>
    <Button :trailingIcon="firstIconName">Add to cart</Button>
    <Button
      :icon="firstIconName"
      :trailingIcon="firstIconName"
      variant="soft"
    >
      View profile
    </Button>
  </div>
</template>
