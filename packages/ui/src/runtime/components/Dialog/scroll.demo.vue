<script lang="ts">
  export const uiDemo = {
    description: 'The content component owns overflow. Scroll to an edge before dragging the sheet.',
    title: 'Long content and scrolling',
  }
</script>

<script setup lang="ts">
  import { defineAsyncComponent } from 'vue'

  import { useDialog } from '../../composables/useDialog'
  import Button from '../Button/index.vue'

  const dialog = useDialog()
  const LazyDemoContent = defineAsyncComponent(() => import('./DemoContent.vue'))
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <Button @click="dialog.open(LazyDemoContent, { text: 'Scrollable bottom sheet' }, { placement: 'bottom' })">
      Scrollable sheet
    </Button>
    <Button @click="dialog.open(LazyDemoContent, { text: 'Scrollable centered dialog' }, { placement: 'center' })">
      Scrollable center
    </Button>
  </div>
</template>
