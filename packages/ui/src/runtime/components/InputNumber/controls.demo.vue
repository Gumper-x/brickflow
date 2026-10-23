<script lang="ts">
  export const uiDemo = {
    description: 'Custom step buttons built with the leading and trailing slots.',
    title: 'Custom controls',
  }
</script>

<script lang="ts" setup>
  import { ref } from 'vue'

  import InputNumber from './index.vue'

  const horizontalValue = ref(20)
  const verticalValue = ref(100)

  const horizontalMin = 0
  const horizontalMax = 25
  const verticalMin = 0
  const verticalMax = 120
  const verticalStep = 5

  const horizontalControlClass =
    'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-plain-500 transition-colors enabled:hover:bg-plain-800 enabled:hover:text-plain-100 disabled:cursor-not-allowed disabled:opacity-40'
  const verticalControlClass =
    'flex min-h-5 flex-1 items-center justify-center text-plain-500 transition-colors enabled:hover:bg-plain-800 enabled:hover:text-plain-100 disabled:cursor-not-allowed disabled:opacity-40'

  function stepHorizontal(direction: -1 | 1): void {
    horizontalValue.value = Math.max(horizontalMin, Math.min(horizontalMax, horizontalValue.value + direction))
  }

  function stepVertical(direction: -1 | 1): void {
    verticalValue.value = Math.max(
      verticalMin,
      Math.min(verticalMax, verticalValue.value + direction * verticalStep),
    )
  }
</script>

<template>
  <div class="flex max-w-sm flex-col gap-6">
    <InputNumber
      :value="horizontalValue"
      align="center"
      label="Number *"
      description="This is a hint text to help user."
      :min="horizontalMin"
      :max="horizontalMax"
      @input="horizontalValue = $event"
    >
      <template #leading>
        <button
          type="button"
          :disabled="horizontalValue <= horizontalMin"
          aria-label="Decrease number"
          :class="[horizontalControlClass, '-ml-2']"
          @click="stepHorizontal(-1)"
        >
          <span
            aria-hidden="true"
            class="text-2xl leading-none font-light"
          >
            −
          </span>
        </button>
      </template>
      <template #trailing>
        <button
          type="button"
          :disabled="horizontalValue >= horizontalMax"
          aria-label="Increase number"
          :class="[horizontalControlClass, '-mr-2']"
          @click="stepHorizontal(1)"
        >
          <span
            aria-hidden="true"
            class="text-2xl leading-none font-light"
          >
            +
          </span>
        </button>
      </template>
    </InputNumber>

    <InputNumber
      :value="verticalValue"
      label="Number *"
      description="This is a hint text to help user."
      :step="verticalStep"
      :min="verticalMin"
      :max="verticalMax"
      @input="verticalValue = $event"
    >
      <template #trailing>
        <span
          class="-mr-3 flex w-12 shrink-0 flex-col self-stretch overflow-hidden rounded-r-xl border-l border-neutral-600/20"
        >
          <button
            type="button"
            :disabled="verticalValue >= verticalMax"
            aria-label="Increase number"
            :class="verticalControlClass"
            @click="stepVertical(1)"
          >
            <svg
              aria-hidden="true"
              class="size-4"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="m3 10 5-5 5 5"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            :disabled="verticalValue <= verticalMin"
            aria-label="Decrease number"
            :class="[verticalControlClass, 'border-t border-neutral-600/20']"
            @click="stepVertical(-1)"
          >
            <svg
              aria-hidden="true"
              class="size-4"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="m3 6 5 5 5-5"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </span>
      </template>
    </InputNumber>
  </div>
</template>
