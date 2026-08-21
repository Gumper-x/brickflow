<script lang="ts">
  export const uiDemo = {
    description: 'The name matches the SVG filename without its extension.',
    title: 'Basic usage',
  }
</script>

<script lang="ts" setup>
  import { ref } from 'vue'

  import { firstIconName } from '#brickflow-ui-icons'

  import Icon from './index.vue'

  const iconName = ref(firstIconName)
</script>

<template>
  <div class="flex flex-col flex-wrap items-start gap-4 text-zinc-100">
    <input
      v-model="iconName"
      aria-label="Icon name"
      class="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-400"
      placeholder="Icon name"
      type="text"
    />

    <div class="flex items-center gap-4">
      <Icon
        :name="iconName"
        class="text-2xl"
      />
      <Icon
        :name="iconName"
        class="w-4"
      />
      <Icon
        :name="iconName"
        class="text-2xl text-green-400"
      />
      <Icon
        :name="iconName"
        class="text-2xl text-red-400"
      />
    </div>
  </div>
</template>
