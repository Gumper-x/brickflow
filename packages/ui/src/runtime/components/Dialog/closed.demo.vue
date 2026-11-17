<script lang="ts">
  export const uiDemo = {
    description: 'Wait for the dialog to close and finish its leave animation, no matter how it is dismissed.',
    title: 'Wait for close',
  }
</script>

<script setup lang="ts">
  import { defineAsyncComponent, ref } from 'vue'

  import { useDialog } from '../../composables/useDialog'
  import Button from '../Button/index.vue'

  const dialog = useDialog()
  const status = ref('Open the dialog to try it.')
  const waiting = ref(false)
  const LazyDemoClosed = defineAsyncComponent(() => import('./DemoClosed.vue'))

  async function openAndWait(): Promise<void> {
    waiting.value = true
    status.value = 'Dialog is open.'
    const handle = dialog.open(LazyDemoClosed, {})
    await handle.closed
    status.value = 'Dialog closed and its leave animation finished.'
    waiting.value = false
  }
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <Button
      :disabled="waiting"
      @click="openAndWait"
    >
      Open dialog
    </Button>
    <p
      class="text-sm text-zinc-300"
      role="status"
    >
      {{ status }}
    </p>
  </div>
</template>
