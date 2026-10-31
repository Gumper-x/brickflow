<script lang="ts">
  export const uiDemo = {
    description: 'Open dialogs on top of each other, close the top one, or clear the whole stack.',
    title: 'Stacked dialogs',
  }
</script>

<script setup lang="ts">
  import { defineAsyncComponent } from 'vue'

  import { useDialog } from '../../composables/useDialog'
  import Button from '../Button/index.vue'

  const dialog = useDialog()
  const LazyDemoStack = defineAsyncComponent(() => import('./DemoStack.vue'))
</script>

<template>
  <Button @click="dialog.open(LazyDemoStack, { level: 1 })">Open stack</Button>
</template>
