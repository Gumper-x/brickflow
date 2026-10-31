<script setup lang="ts">
  import { defineAsyncComponent } from 'vue'

  import { useDialog } from '../../composables/useDialog'
  import Button from '../Button/index.vue'

  const props = defineProps<{ level: number }>()
  const dialog = useDialog()
  const LazyDemoStack = defineAsyncComponent(() => import('./DemoStack.vue'))

  function openNext(): void {
    dialog.open(LazyDemoStack, { level: props.level + 1 })
  }
</script>

<template>
  <div class="space-y-4 p-5">
    <div class="space-y-1">
      <h2 class="font-semibold">Dialog {{ level }}</h2>
      <p class="text-sm text-zinc-300">
        Stack depth: {{ dialog.stack.length }}. Closing the top reveals the previous one.
      </p>
    </div>
    <div class="flex flex-wrap gap-2">
      <Button @click="openNext">Open on top</Button>
      <Button
        color="plain"
        @click="dialog.close()"
      >
        Close top
      </Button>
      <Button
        color="plain"
        variant="ghost"
        @click="dialog.closeAll()"
      >
        Close all
      </Button>
    </div>
  </div>
</template>
