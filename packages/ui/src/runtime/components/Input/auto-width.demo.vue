<script lang="ts">
  export const uiDemo = {
    title: 'Auto Width',
  }
</script>

<script lang="ts" setup>
  import Input from './index.vue'
</script>

<template>
  <div class="flex flex-col gap-3">
    <Input
      placeholder="Type here"
      label="Auto Width"
      autoWidth
      class="max-w-sm"
    />
  </div>
</template>
