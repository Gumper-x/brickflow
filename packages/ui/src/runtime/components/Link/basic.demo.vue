<script lang="ts">
  export const uiDemo = {
    description: 'Internal navigation keeps the current locale.',
    title: 'Basic usage',
  }
</script>

<script lang="ts" setup>
  import Link from './index.vue'
</script>

<template>
  <div class="flex flex-wrap items-center gap-4">
    <Link
      to="/"
      class="text-main-300 hover:text-main-200"
    >
      Go to Home
    </Link>
    <Link
      to="/ui?component=button"
      class="text-main-300 hover:text-main-200"
    >
      Open Button
    </Link>
  </div>
</template>
