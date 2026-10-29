<script lang="ts">
  export const uiDemo = {
    description:
      'Open centered dialogs or bottom sheets. Scroll the sheet, then swipe down from the top to close it.',
    title: 'Stack and placement',
  }
</script>

<script setup lang="ts">
  import { defineAsyncComponent } from 'vue'

  import { useDialog } from '../../composables/useDialog'
  import Button from '../Button/index.vue'

  const dialog = useDialog()
  const LazyDemoDialog = defineAsyncComponent(() => import('./DemoContent.vue'))
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <Button @click="dialog.open(LazyDemoDialog, { text: `Dialog №${dialog.stack.length + 1}` })">
      Open dialog
    </Button>
    <Button
      @click="
        dialog.open(
          LazyDemoDialog,
          { text: `Dialog №${dialog.stack.length + 1} · rubber bottom` },
          { placement: 'bottom' },
        )
      "
    >
      Open rubber bottom
    </Button>
    <Button
      @click="
        dialog.open(
          LazyDemoDialog,
          { text: `Dialog №${dialog.stack.length + 1} · movable bottom` },
          { placement: 'bottom', rubberBand: false },
        )
      "
    >
      Open movable bottom
    </Button>
    <Button @click="dialog.open(LazyDemoDialog, { text: 'Fullscreen dialog' }, { placement: 'fullscreen' })">
      Open fullscreen
    </Button>
  </div>
</template>
