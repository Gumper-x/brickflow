<script lang="ts">
  export const uiDemo = {
    title: 'Color & Variants',
  }
</script>

<script lang="ts" setup>
  import Button from './index.vue'

  const UI_CONFIG = defineUiConfig<{
    colorClasses: Record<string, Record<string, string>>
  }>()

  type ButtonColor = Extract<keyof typeof UI_CONFIG.colorClasses, string>
  type ButtonVariant = Extract<keyof (typeof UI_CONFIG.colorClasses)[ButtonColor], string>

  const colors = Object.entries(UI_CONFIG.colorClasses).map(([name, classes]) => ({
    name: name as ButtonColor,
    variants: Object.keys(classes) as ButtonVariant[],
  }))
  const variants = colors[0]?.variants ?? []
</script>

<template>
  <div class="relative flex w-fit flex-col items-start gap-3 pl-13">
    <div class="absolute top-0 left-0 z-0 size-full object-cover pt-7 pl-13">
      <img
        src="https://images.unsplash.com/photo-1545346315-f4c47e3e1b55?ixid=M3w4MjcwNjd8MHwxfHNlYXJjaHwyfHxzdHJvbmclMjBtYW58ZW58MHx8fHwxNzg4MjIyNTU1fDA&ixlib=rb-4.1.0&w=1000&h=1000&fit=max&q=80"
        class="top-0 z-0 size-full rounded-xl object-cover opacity-50"
      />
    </div>
    <div class="flex w-full flex-wrap items-center justify-around gap-3 text-xs text-slate-600">
      <span
        v-for="variant in variants"
        :key="variant"
      >
        {{ variant }}
      </span>
    </div>
    <div
      v-for="color in colors"
      :key="color.name"
      class="relative flex w-full flex-wrap items-center gap-3 p-2"
    >
      <span class="absolute top-1/2 right-full mr-3 -translate-y-1/2 text-xs text-slate-600">
        {{ color.name }}
      </span>
      <Button
        v-for="variant in color.variants"
        :key="variant"
        :color="color.name"
        :variant="variant"
      >
        Button
      </Button>
    </div>
  </div>
</template>
