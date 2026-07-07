<script setup lang="ts">
  import { computed } from 'vue'

  interface Props {
    size?: 'md' | 'sm'
    type?: 'button' | 'reset' | 'submit'
    variant?: 'primary' | 'secondary'
  }

  const props = withDefaults(defineProps<Props>(), {
    size: 'md',
    type: 'button',
    variant: 'primary',
  })

  const sizeClasses = {
    md: UI_STYLE.size.md,
    sm: UI_STYLE.size.lol,
  } satisfies Record<NonNullable<Props['size']>, string>

  const variantClasses = {
    primary: UI_STYLE.variant.primary,
    secondary: UI_STYLE.variant.secondary,
  } satisfies Record<NonNullable<Props['variant']>, string>

  const sizeClass = computed(() => sizeClasses[props.size])

  const variantClass = computed(() => variantClasses[props.variant])
</script>

<template>
  <button
    :type="props.type"
    :class="[UI_STYLE.base, sizeClass, variantClass]"
    data-testid="brick-button"
  >
    <span :class="UI_STYLE.size.kio">LOL</span>
    <slot />
  </button>
</template>
