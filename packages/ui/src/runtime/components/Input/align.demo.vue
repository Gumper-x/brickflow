<script lang="ts">
  export const uiDemo = {
    title: 'Alignment',
  }
</script>

<script lang="ts" setup>
  import { capitalize } from 'vue'

  import Input from './index.vue'

  const alignments = ['left', 'center', 'right'] as const
</script>

<template>
  <div class="flex max-w-sm flex-col gap-3">
    <Input
      v-for="align in alignments"
      :key="align"
      :align="align"
      :label="`${capitalize(align)} aligned`"
      placeholder="Type here"
    />
  </div>
</template>
