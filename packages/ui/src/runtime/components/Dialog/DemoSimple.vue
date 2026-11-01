<script setup lang="ts">
  import { useDialog } from '../../composables/useDialog'
  import Button from '../Button/index.vue'

  defineProps<{ title: string }>()

  const dialog = useDialog()
</script>

<template>
  <div class="space-y-4 p-5">
    <div class="space-y-1">
      <h2 class="font-semibold">{{ title }}</h2>
      <p class="text-sm text-zinc-300">The placement changes; this content component stays the same.</p>
    </div>
    <Button
      color="plain"
      @click="dialog.close()"
    >
      Close
    </Button>
  </div>
</template>
