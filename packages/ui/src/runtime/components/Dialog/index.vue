<script lang="ts">
  import type { DialogPlacement } from '../../composables/useDialog'
  import type { ScreenKey } from '../../composables/useScreen'

  export const dialogConfig = defineUiConfig<{
    placement: Record<ScreenKey, DialogPlacement>
    rubberBand?: boolean
  }>()
</script>

<script setup lang="ts">
  defineProps<{
    dragY?: number
    placement: 'bottom' | 'center' | 'fullscreen'
    rubberBand: boolean
    settling?: boolean
  }>()

  const placementClasses = {
    bottom: UI_STYLE.placementClasses.bottom,
    center: UI_STYLE.placementClasses.center,
    fullscreen: UI_STYLE.placementClasses.fullscreen,
  }
</script>

<template>
  <div
    :class="[UI_STYLE.panel, placementClasses[placement]]"
    data-dialog-panel
    role="dialog"
    aria-modal="true"
    :style="{
      '--dialog-rubber-height':
        placement === 'bottom' && rubberBand ? `${Math.max(0, -(dragY ?? 0))}px` : undefined,
      transform: dragY && (!rubberBand || dragY > 0) ? `translateY(${dragY}px)` : undefined,
    }"
  >
    <div
      v-if="placement === 'bottom'"
      :class="UI_STYLE.handle"
      data-dialog-handle
      aria-hidden="true"
    >
      <span :class="UI_STYLE.handleIndicator" />
    </div>
    <div
      :class="[
        UI_STYLE.content,
        placement === 'bottom' && rubberBand && UI_STYLE.contentBottom,
        settling && rubberBand && UI_STYLE.rubberSettle,
      ]"
    >
      <slot />
    </div>
  </div>
</template>
