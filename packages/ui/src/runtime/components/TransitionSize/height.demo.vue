<script lang="ts">
  export const uiDemo = {
    title: 'Height',
  }
</script>

<script lang="ts" setup>
  import { ref } from 'vue'

  import TransitionSize from './index.vue'

  const activeHeightFixed = ref(true)
  const activeHeightContent = ref(true)
  const activeHeightFull = ref(true)
</script>

<template>
  <div class="flex w-full gap-4">
    <div class="flex grow basis-1 flex-col">
      <label class="mb-2">Fixed height</label>
      <TransitionSize
        :duration="1000"
        dimension="height"
      >
        <div
          v-if="activeHeightFixed"
          class="h-40 w-full rounded-xl bg-slate-700 p-2 text-center"
        >
          Text
        </div>
      </TransitionSize>
      <button
        type="button"
        class="mt-3 w-full shrink-0 cursor-pointer rounded-xl px-3 py-2"
        :class="activeHeightFixed ? 'bg-blue-500' : 'bg-blue-800'"
        @click="activeHeightFixed = !activeHeightFixed"
      >
        {{ activeHeightFixed ? 'Hide' : 'Show' }}
      </button>
    </div>

    <div class="flex grow basis-1 flex-col">
      <label class="mb-2">Content based height</label>
      <TransitionSize
        :duration="1000"
        dimension="height"
      >
        <div
          v-if="activeHeightContent"
          class="rounded-xl bg-slate-700 p-2 text-center"
        >
          Lorem, ipsum dolor sit amet consectetur adipisicing elit. Tenetur nihil possimus sunt ipsum rerum maiores
        </div>
      </TransitionSize>
      <button
        type="button"
        class="mt-3 w-full shrink-0 cursor-pointer rounded-xl px-3 py-2"
        :class="activeHeightContent ? 'bg-blue-500' : 'bg-blue-800'"
        @click="activeHeightContent = !activeHeightContent"
      >
        {{ activeHeightContent ? 'Hide' : 'Show' }}
      </button>
    </div>

    <div class="flex h-auto grow basis-1 flex-col self-stretch">
      <label class="mb-2">Full height</label>
      <TransitionSize
        :duration="1000"
        dimension="height"
      >
        <div
          v-if="activeHeightFull"
          class="w-full grow rounded-xl bg-slate-700 p-2 text-center"
        >
          Text
        </div>
      </TransitionSize>
      <button
        type="button"
        class="mt-3 w-full shrink-0 cursor-pointer rounded-xl px-3 py-2"
        :class="activeHeightFull ? 'bg-blue-500' : 'bg-blue-800'"
        @click="activeHeightFull = !activeHeightFull"
      >
        {{ activeHeightFull ? 'Hide' : 'Show' }}
      </button>
    </div>
  </div>
</template>
