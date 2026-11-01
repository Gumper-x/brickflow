<script lang="ts">
  import type { IconName } from '#brickflow-ui'

  import type { DialogPlacement } from '../../composables/useDialog'
  import type { ScreenKey } from '../../composables/useScreen'

  export const dialogConfig = defineUiConfig<{
    elasticHeight?: boolean
    loadingDelay: number
    loadingIconName: IconName
    loadingIconTransition: string
    placement: Record<ScreenKey, DialogPlacement>
  }>()
</script>

<script setup lang="ts">
  defineProps<{
    dragY?: number
    elasticHeight: boolean
    placement: 'bottom' | 'center' | 'fullscreen'
  }>()

  const placementClasses = {
    bottom: UI_STYLE.panelPlacementClasses.bottom,
    center: UI_STYLE.panelPlacementClasses.center,
    fullscreen: UI_STYLE.panelPlacementClasses.fullscreen,
  }
</script>

<template>
  <div
    :class="[UI_STYLE.panel, placementClasses[placement]]"
    data-dialog-panel
    role="dialog"
    aria-modal="true"
    tabindex="-1"
    :style="{
      '--dialog-elastic-height':
        placement === 'bottom' && elasticHeight ? `${Math.max(0, -(dragY ?? 0))}px` : undefined,
      transform: dragY && (!elasticHeight || dragY > 0) ? `translateY(${dragY}px)` : undefined,
    }"
  >
    <div
      v-if="placement === 'bottom'"
      :class="UI_STYLE.dragHandle"
      data-dialog-handle
      aria-hidden="true"
    >
      <span :class="UI_STYLE.dragHandleIndicator" />
    </div>
    <slot />
  </div>
</template>
