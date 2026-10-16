<script lang="ts">
  export const uiDemo = {
    title: 'Width',
  }
</script>

<script lang="ts" setup>
  import { ref } from 'vue'

  import TransitionSize from './index.vue'

  const activeWidthFixed = ref(true)
  const activeWidthContent = ref(true)
  const activeWidthFull = ref(true)
</script>

<template>
  <div class="flex w-full flex-col">
    <label class="mb-2">Fixed width</label>
    <div class="flex w-full">
      <TransitionSize
        :duration="1000"
        dimension="width"
      >
        <div
          v-if="activeWidthFixed"
          class="w-30 rounded-xl bg-slate-700 p-2 text-center"
        >
          Text
        </div>
      </TransitionSize>
      <button
        type="button"
        class="ml-2 w-30 shrink-0 cursor-pointer rounded-xl px-3 py-2"
        :class="activeWidthFixed ? 'bg-blue-500' : 'bg-blue-800'"
        @click="activeWidthFixed = !activeWidthFixed"
      >
        {{ activeWidthFixed ? 'Hide' : 'Show' }}
      </button>
    </div>

    <label class="mt-4 mb-2">Content based width</label>
    <div class="flex">
      <TransitionSize
        :duration="1000"
        dimension="width"
      >
        <div
          v-if="activeWidthContent"
          class="rounded-xl bg-slate-700 p-2 text-center whitespace-nowrap"
        >
          Long content text
        </div>
      </TransitionSize>
      <button
        type="button"
        class="ml-2 w-30 shrink-0 cursor-pointer rounded-xl px-3 py-2"
        :class="activeWidthContent ? 'bg-blue-500' : 'bg-blue-800'"
        @click="activeWidthContent = !activeWidthContent"
      >
        {{ activeWidthContent ? 'Hide' : 'Show' }}
      </button>
    </div>

    <label class="mt-4 mb-2">Full width</label>
    <div class="flex w-full">
      <TransitionSize
        :duration="1000"
        dimension="width"
      >
        <div
          v-if="activeWidthFull"
          class="w-full rounded-xl bg-slate-700 p-2 text-center"
        >
          Text
        </div>
      </TransitionSize>
      <button
        type="button"
        class="ml-2 w-30 shrink-0 cursor-pointer rounded-xl px-3 py-2"
        :class="activeWidthFull ? 'bg-blue-500' : 'bg-blue-800'"
        @click="activeWidthFull = !activeWidthFull"
      >
        {{ activeWidthFull ? 'Hide' : 'Show' }}
      </button>
    </div>
  </div>
</template>
