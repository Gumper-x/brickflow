<script lang="ts">
  export const uiDemo = {
    description: 'Compare responsive placement, a bottom sheet, and a fullscreen dialog.',
    title: 'Placement and motion',
  }
</script>

<script setup lang="ts">
  import { defineAsyncComponent } from 'vue'

  import { useDialog } from '../../composables/useDialog'
  import Button from '../Button/index.vue'

  const dialog = useDialog()
  const LazyDemoDialog = defineAsyncComponent(() => import('./DemoSimple.vue'))
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <Button @click="dialog.open(LazyDemoDialog, { title: 'Responsive dialog' })">Default placement</Button>
    <Button @click="dialog.open(LazyDemoDialog, { title: 'Bottom sheet' }, { placement: 'bottom' })">
      Bottom sheet
    </Button>
    <Button
      @click="
        dialog.open(LazyDemoDialog, { title: 'Movable bottom sheet' }, { placement: 'bottom', rubberBand: false })
      "
    >
      Movable sheet
    </Button>
    <Button @click="dialog.open(LazyDemoDialog, { title: 'Fullscreen dialog' }, { placement: 'fullscreen' })">
      Fullscreen
    </Button>
  </div>
</template>
