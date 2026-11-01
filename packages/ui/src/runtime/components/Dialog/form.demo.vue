<script lang="ts">
  export const uiDemo = {
    description: 'Keep form state inside the dialog, require an explicit choice, and return the saved value.',
    title: 'Form and explicit dismissal',
  }
</script>

<script setup lang="ts">
  import { defineAsyncComponent, ref } from 'vue'

  import { useDialog } from '../../composables/useDialog'
  import Button from '../Button/index.vue'

  const dialog = useDialog()
  const savedName = ref('')
  const LazyDemoForm = defineAsyncComponent(() => import('./DemoForm.vue'))

  function openForm(): void {
    dialog.open(LazyDemoForm, { onSave: (name: string) => (savedName.value = name) }, { preventClose: true })
  }
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <Button @click="openForm">Create project</Button>
    <p
      v-if="savedName"
      class="text-sm text-zinc-300"
      role="status"
    >
      Saved: {{ savedName }}
    </p>
  </div>
</template>
