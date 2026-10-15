<script lang="ts">
  export const uiDemo = {
    title: 'Label & Description, Placeholder',
  }
</script>

<script lang="ts" setup>
  import { shallowRef } from 'vue'

  import Input from './index.vue'

  const active = shallowRef(true)
</script>

<template>
  <div class="max-w-sm">
    <Input
      :label="active ? 'Email address' : undefined"
      :description="active ? 'We will use this address to contact you.' : undefined"
      :placeholder="active ? 'name@example.com' : undefined"
      type="email"
    />
    <button
      type="button"
      class="mt-4 w-30 cursor-pointer rounded-xl px-3 py-2"
      :class="active ? 'bg-blue-500' : 'bg-blue-800'"
      @click="active = !active"
    >
      {{ active ? 'Hide' : 'Show' }}
    </button>
  </div>
</template>
