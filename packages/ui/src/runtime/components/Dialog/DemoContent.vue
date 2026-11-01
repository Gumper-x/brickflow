<script setup lang="ts">
  import { useDialog } from '../../composables/useDialog'
  import Button from '../Button/index.vue'

  defineProps<{ text: string }>()

  const dialog = useDialog()
</script>

<template>
  <div class="min-h-0 space-y-4 overflow-y-auto bg-linear-to-tr from-violet-900 to-gray-800 p-5">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="font-semibold">{{ text }}</p>
      <Button
        color="plain"
        @click="dialog.close()"
      >
        Close
      </Button>
    </div>
    <p class="text-sm text-zinc-200">Scroll this content, then swipe down from the top edge to move the sheet.</p>
    <ul class="divide-y divide-white/10">
      <li
        v-for="i in 40"
        :key="i"
        class="flex items-center justify-between gap-4 py-2 text-sm"
      >
        <span>Activity {{ i }}</span>
        <span class="text-zinc-300">{{ i % 2 ? 'Updated' : 'Created' }}</span>
      </li>
    </ul>
  </div>
</template>
