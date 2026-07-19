<script lang="ts">
  export const uiDemo = {
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
      <span class="text-xs">leading</span>
    </template>
    Added {{ clicks }} times
    <template #trailing>
      <span class="text-xs">trailing</span>
    </template>
  </Button>
</template>
