<script setup lang="ts">
  import { defineAsyncComponent } from 'vue'

  import { useDialog } from '../../composables/useDialog'
  import Button from '../Button/index.vue'

  defineProps<{ text: string }>()

  const dialog = useDialog()
  const LazyDemoDialog = defineAsyncComponent(() => import('./DemoContent.vue'))
</script>

<template>
  <div class="min-h-0 space-y-4 overflow-y-auto bg-linear-to-tr from-violet-900 to-gray-800 px-6 pt-10 pb-6">
    <p>{{ text }}</p>
    <ul>
      <li
        v-for="i in 100"
        :key="i"
      >
        Some text {{ i }}
      </li>
    </ul>
    <div class="flex flex-wrap gap-2">
      <Button @click="dialog.open(LazyDemoDialog, { text: `Dialog №${dialog.stack.length + 1}` })">
        Open on top
      </Button>
      <Button
        color="plain"
        @click="dialog.close()"
      >
        Close
      </Button>
    </div>
  </div>
</template>
