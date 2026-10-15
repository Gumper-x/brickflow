<script lang="ts">
  export const uiDemo = {
    title: 'Duration',
  }
</script>

<script lang="ts" setup>
  import { ref } from 'vue'

  import TransitionSize from './index.vue'

  const active100 = ref(true)
  const active500 = ref(true)
  const active2000 = ref(true)
</script>

<template>
  <div class="flex w-full flex-col">
    <code class="mb-2">100</code>
    <div class="flex w-full">
      <TransitionSize
        :duration="100"
        dimension="width"
      >
        <div
          v-if="active100"
          class="w-full rounded-xl bg-slate-700 p-2 text-center"
        >
          Text
        </div>
      </TransitionSize>
      <button
        type="button"
        class="ml-2 w-30 shrink-0 cursor-pointer rounded-xl px-3 py-2"
        :class="active100 ? 'bg-blue-500' : 'bg-blue-800'"
        @click="active100 = !active100"
      >
        {{ active100 ? 'Hide' : 'Show' }}
      </button>
    </div>

    <code class="mt-4 mb-2">500</code>
    <div class="flex">
      <TransitionSize
        :duration="500"
        dimension="width"
      >
        <div
          v-if="active500"
          class="w-full rounded-xl bg-slate-700 p-2 text-center whitespace-nowrap"
        >
          Text
        </div>
      </TransitionSize>
      <button
        type="button"
        class="ml-2 w-30 shrink-0 cursor-pointer rounded-xl px-3 py-2"
        :class="active500 ? 'bg-blue-500' : 'bg-blue-800'"
        @click="active500 = !active500"
      >
        {{ active500 ? 'Hide' : 'Show' }}
      </button>
    </div>

    <code class="mt-4 mb-2">2000</code>
    <div class="flex w-full">
      <TransitionSize
        :duration="2000"
        dimension="width"
      >
        <div
          v-if="active2000"
          class="w-full rounded-xl bg-slate-700 p-2 text-center"
        >
          Text
        </div>
      </TransitionSize>
      <button
        type="button"
        class="ml-2 w-30 shrink-0 cursor-pointer rounded-xl px-3 py-2"
        :class="active2000 ? 'bg-blue-500' : 'bg-blue-800'"
        @click="active2000 = !active2000"
      >
        {{ active2000 ? 'Hide' : 'Show' }}
      </button>
    </div>
  </div>
</template>
