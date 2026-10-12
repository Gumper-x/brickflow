<script lang="ts">
  export const uiDemo = {
    title: 'Input Types',
  }
</script>

<script lang="ts" setup>
  import { capitalize } from 'vue'

  import Input from './index.vue'

  const types = ['text', 'email', 'number', 'password', 'search', 'url'] as const
</script>

<template>
  <div class="flex max-w-sm flex-col gap-3">
    <Input
      v-for="type in types"
      :key="type"
      :type="type"
      :label="capitalize(type)"
      :placeholder="`Enter ${type}`"
    />
  </div>
</template>
