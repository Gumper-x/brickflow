<script setup lang="ts">
  import { ref } from 'vue'

  import { useDialog } from '../../composables/useDialog'
  import Button from '../Button/index.vue'
  import Input from '../Input/index.vue'

  const props = defineProps<{ onSave: (name: string) => void }>()
  const dialog = useDialog()
  const name = ref('')

  function save(): void {
    const value = name.value.trim()
    if (!value) {
      return
    }
    props.onSave(value)
    dialog.close()
  }
</script>

<template>
  <form
    class="space-y-4 p-5"
    @submit.prevent="save"
  >
    <div class="space-y-1">
      <h2 class="font-semibold">Create a project</h2>
      <p class="text-sm text-zinc-300">Form state belongs to the dialog content.</p>
    </div>
    <Input
      :value="name"
      label="Project name"
      placeholder="My project"
      autocomplete="off"
      @input="name = $event"
    />
    <div class="flex flex-wrap gap-2">
      <Button
        type="submit"
        :disabled="!name.trim()"
      >
        Save project
      </Button>
      <Button
        color="plain"
        type="button"
        @click="dialog.close()"
      >
        Cancel
      </Button>
    </div>
  </form>
</template>
