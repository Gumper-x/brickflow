<script lang="ts">
  export const uiDemo = {
    title: 'State',
  }
</script>

<script lang="ts" setup>
  import { buttonConfig } from '#brickflow-ui-icons'

  import Button from './index.vue'

  const firstColorClasses = Object.values(buttonConfig.colorClasses)[0] ?? {}
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <div class="basis-full">
      <div class="relative flex w-fit flex-col items-start gap-3 pl-13">
        <div class="absolute top-0 left-0 z-0 size-full object-cover pt-7 pl-13">
          <img
            src="https://images.unsplash.com/photo-1545346315-f4c47e3e1b55?ixid=M3w4MjcwNjd8MHwxfHNlYXJjaHwyfHxzdHJvbmclMjBtYW58ZW58MHx8fHwxNzg4MjIyNTU1fDA&ixlib=rb-4.1.0&w=1000&h=1000&fit=max&q=80"
            class="top-0 z-0 size-full rounded-xl object-cover opacity-50"
          />
        </div>
        <div class="flex w-full items-center justify-around gap-3 text-xs text-slate-600">
          <span
            v-for="(_, variant) in firstColorClasses"
            :key="variant"
          >
            {{ variant }}
          </span>
        </div>
        <div
          v-for="(variants, color) in buttonConfig.colorClasses"
          :key="color"
          class="relative flex w-full items-center gap-3 p-2"
        >
          <span class="absolute top-1/2 right-full mr-3 -translate-y-1/2 text-xs text-slate-600">
            {{ color }}
          </span>
          <div
            v-for="(_, variant) in variants"
            :key="variant"
            class="flex flex-col items-stretch gap-2"
          >
            <Button
              disabled
              :color="color"
              :variant="variant"
            >
              Disabled
            </Button>
            <Button
              loading
              :color="color"
              :variant="variant"
            >
              Loading
            </Button>
          </div>
        </div>
      </div>
    </div>

    <Button to="/">Link</Button>
    <Button block>Block</Button>
  </div>
</template>
