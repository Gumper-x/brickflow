<script setup lang="ts">
  import { LazyDialogExample } from '#components'

  import { useDialog } from '../../../../../packages/ui/src/runtime/composables/useDialog'

  defineProps<{ text: string }>()

  const dialog = useDialog()
</script>

<template>
  <div class="space-y-4 p-6">
    <p>{{ text }}</p>
    <div class="flex gap-2">
      <BrickButton @click="dialog.open(LazyDialogExample, { text: `Dialog №${dialog.stack.length + 1}` })">
        Open another
      </BrickButton>
      <BrickButton
        color="plain"
        @click="dialog.close()"
      >
        Close
      </BrickButton>
    </div>
  </div>
</template>
