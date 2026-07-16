<script lang="ts">
  export const uiDemo = {
    description: 'Color and surface variants.',
    title: 'Variants',
  }
</script>

<script lang="ts" setup>
  import Button from './index.vue'
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <Button>Primary</Button>
    <Button
      color="plain"
      variant="glass"
    >
      Secondary
    </Button>
    <Button
      color="win"
      variant="soft"
    >
      Saved
    </Button>
    <Button
      color="danger"
      variant="ghost"
    >
      Delete
    </Button>
  </div>
</template>
