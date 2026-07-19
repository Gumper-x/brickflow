<script lang="ts">
  export const uiDemo = {
    title: 'State',
  }
</script>

<script lang="ts" setup>
  import Button from './index.vue'
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <Button loading>Loading</Button>
    <Button disabled>Disabled</Button>
    <Button to="/">Link</Button>
    <Button block>Block</Button>
  </div>
</template>
