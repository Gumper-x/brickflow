<script lang="ts">
  export const uiDemo = {
    description: 'Leading, default and trailing slots.',
    title: 'Slots',
  }
</script>

<script lang="ts" setup>
  import { ref } from 'vue'

  import Button from './index.vue'

  const clicks = ref(0)
</script>

<template>
  <Button @click="clicks += 1">
    <template #leading>
      <span aria-hidden="true">+</span>
    </template>
    Added {{ clicks }} times
    <template #trailing>
      <span aria-hidden="true">→</span>
    </template>
  </Button>
</template>
