<script lang="ts" setup>
  const app = useNuxtApp()
  const httpProducts = await app.$di.product.products({
    lazy: true,
  })
  const httpProduct1 = await app.$di.product.productOne({
    initParams: {
      productId: '1',
    },
  })
  const httpProduct2 = await app.$di.product.productOne2({
    initParams: {
      productId: '2',
      test: 3,
    },
  })
  // const httpProduct3 = await app.$di.product.productOne3({
  //   initParams: {
  //     productId: '3',
  //   },
  // })
</script>

<template>
  <main class="space-y-4 p-6">
    <h1>Playground</h1>
    <BrickButton>sdf</BrickButton>
    <button
      type="button"
      class="bg-green-950 tabular-nums text-green-400 rounded-md px-2 py-1 cursor-pointer"
      @click="httpProducts.fetch()"
    >
      {{ httpProducts.hasFirstData }} Action
    </button>
    httpProduct1
    {{ httpProduct1.hasFirstData }}
    httpProduct2
    {{ httpProduct2.hasFirstData }}
    <br />
    {{ httpProducts.data }}
  </main>
</template>
