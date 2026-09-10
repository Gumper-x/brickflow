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
    :class="classes"
    role="img"
  />
</template>

<style scoped>
  @layer base {
    i {
      aspect-ratio: 1;
      container-type: inline-size;
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      width: 1em;
      line-height: 1;
      vertical-align: -0.125em;
    }

    i::before {
      font-size: 100cqi;
      line-height: 1;
    }
  }
</style>
