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

    <p>
      Text with icon
      <Icon :name="iconName" />
      sample words.
    </p>

    <div class="flex items-start gap-2">
      <Icon
        :name="iconName"
        class="bg-linear-to-tr from-red-400 to-blue-400 bg-clip-text text-transparent"
      />
      <div class="bg-gray-700">
        <Icon :name="iconName" />
      </div>
      <div class="bg-gray-700 leading-0">
        <Icon :name="iconName" />
      </div>
    </div>
  </div>
</template>
