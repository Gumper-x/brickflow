<script setup lang="ts">
  import { computed } from 'vue'

  defineOptions({
    inheritAttrs: false,
  })

  const props = withDefaults(
    defineProps<{
      name: string
    }>(),
    {},
  )

  const classes = computed(() => `icon-${props.name}`)
</script>

<template>
  <i
    v-bind="$attrs"
    :class="[classes, 'aspect-square']"
    role="img"
  />
</template>
