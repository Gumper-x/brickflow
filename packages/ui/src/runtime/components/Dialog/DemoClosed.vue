<script setup lang="ts">
  import { useDialog } from '../../composables/useDialog'
  import Button from '../Button/index.vue'

  const dialog = useDialog()
</script>

<template>
  <div class="space-y-4 p-5">
    <div class="space-y-1">
      <h2 class="font-semibold">Wait for close</h2>
      <p class="text-sm text-zinc-300">Close with this button, Escape, or the backdrop.</p>
    </div>
    <Button
      color="plain"
      @click="dialog.close()"
    >
      Close
    </Button>
  </div>
</template>
