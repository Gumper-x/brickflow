<script lang="ts" setup>
  console.log('SETUP')
  const app = useNuxtApp()
  const httpProducts = await app.$di.product.products({
    lazy: true,
  })
</script>

<template>
  <main class="space-y-4 p-6">
    <h1>Playground</h1>
    <button
      type="button"
      class="bg-green-950 text-green-400 rounded-md px-2 py-1 cursor-pointer"
      @click="httpProducts.fetch()"
    >
      {{ httpProducts.hasFirstData }} Action
    </button>
    <br />
    {{ httpProducts.data }}
  </main>
</template>
