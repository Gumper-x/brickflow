<script lang="ts">
  export const uiDemo = {
    title: 'Label & Description, Placeholder',
  }
</script>

<script lang="ts" setup>
  import Input from './index.vue'
</script>

<template>
  <div class="max-w-sm">
    <Input
      label="Email address"
      description="We will use this address to contact you."
      placeholder="name@example.com"
      type="email"
    />
  </div>
</template>
