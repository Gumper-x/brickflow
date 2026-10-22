<script lang="ts">
  export const uiDemo = {
    title: 'Flex Parent with Gap',
  }
</script>

<script lang="ts" setup>
  import { ref } from 'vue'

  import TransitionSize from './index.vue'

  const baseStartRef = ref<HTMLElement | null>(null)
  const baseCenterRef = ref<HTMLElement | null>(null)
  const baseEndRef = ref<HTMLElement | null>(null)
  const activeStart = ref(true)
  const activeCenter = ref(true)
  const activeEnd = ref(true)
</script>

<template>
  <div class="flex flex-col">
    <code class="mb-2">flexDirection="start"</code>
    <div
      ref="baseStartRef"
      class="flex grow basis-1 gap-10"
    >
      <TransitionSize
        :duration="1000"
        :flexParent="baseStartRef"
        flexDirection="start"
        dimension="width"
      >
        <div
          v-if="activeStart"
          class="h-10 grow rounded-xl bg-slate-700 p-2 text-center"
        >
          Text
        </div>
      </TransitionSize>
      <div class="h-10 grow rounded-xl bg-slate-800 p-2 text-center">Text</div>
      <div class="h-10 grow rounded-xl bg-slate-800 p-2 text-center">Text</div>
    </div>
    <button
      type="button"
      class="mt-3 w-30 shrink-0 cursor-pointer rounded-xl px-3 py-2"
      :class="activeStart ? 'bg-blue-500' : 'bg-blue-800'"
      @click="activeStart = !activeStart"
    >
      {{ activeStart ? 'Hide' : 'Show' }}
    </button>

    <code class="mt-6 mb-2">flexDirection="center"</code>
    <div
      ref="baseCenterRef"
      class="flex grow basis-1 gap-10"
    >
      <div class="h-10 grow rounded-xl bg-slate-800 p-2 text-center">Text</div>
      <TransitionSize
        :duration="1000"
        :flexParent="baseCenterRef"
        flexDirection="center"
        dimension="width"
      >
        <div
          v-if="activeCenter"
          class="h-10 grow rounded-xl bg-slate-700 p-2 text-center"
        >
          Text
        </div>
      </TransitionSize>
      <div class="h-10 grow rounded-xl bg-slate-800 p-2 text-center">Text</div>
    </div>
    <button
      type="button"
      class="mt-3 w-30 shrink-0 cursor-pointer rounded-xl px-3 py-2"
      :class="activeCenter ? 'bg-blue-500' : 'bg-blue-800'"
      @click="activeCenter = !activeCenter"
    >
      {{ activeCenter ? 'Hide' : 'Show' }}
    </button>

    <code class="mt-6 mb-2">flexDirection="end"</code>
    <div
      ref="baseEndRef"
      class="flex grow basis-1 gap-10"
    >
      <div class="h-10 grow rounded-xl bg-slate-800 p-2 text-center">Text</div>
      <div class="h-10 grow rounded-xl bg-slate-800 p-2 text-center">Text</div>
      <TransitionSize
        :duration="1000"
        :flexParent="baseEndRef"
        flexDirection="end"
        dimension="width"
      >
        <div
          v-if="activeEnd"
          class="h-10 grow rounded-xl bg-slate-700 p-2 text-center"
        >
          Text
        </div>
      </TransitionSize>
    </div>
    <button
      type="button"
      class="mt-3 w-30 shrink-0 cursor-pointer rounded-xl px-3 py-2"
      :class="activeEnd ? 'bg-blue-500' : 'bg-blue-800'"
      @click="activeEnd = !activeEnd"
    >
      {{ activeEnd ? 'Hide' : 'Show' }}
    </button>
  </div>
</template>
