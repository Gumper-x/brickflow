<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

  import type { DialogController, DialogPlacement, DialogPlacementConfig } from '../../composables/useDialog'

  import { useScreen } from '../../composables/useScreen'
  import Dialog from './index.vue'

  const props = defineProps<{ dialog: DialogController }>()
  const screen = useScreen()
  const placementClasses = {
    bottom: UI_STYLE.placementClasses.bottom,
    center: UI_STYLE.placementClasses.center,
    fullscreen: UI_STYLE.placementClasses.fullscreen,
  }
  const screenKeys = ['ms', 'mb', 'tb', 'lp', 'dk'] as const
  function resolvePlacement(config: DialogPlacementConfig): DialogPlacement {
    if (typeof config === 'string') {
      return config
    }
    const key = screenKeys.find((candidate) => screen[candidate])
    return key ? config[key] : 'center'
  }
  const dragY = ref(0)
  const draggedId = ref<number>()
  const dismissDistance = ref(320)
  const isDragging = ref(false)
  let startY = 0
  let pointerId: number | undefined
  let pointerDialogId: number | undefined
  let pointerStartX = 0
  let pointerStartY = 0
  let settleTimer: number | undefined
  let suppressBackdropClickUntil = 0
  let dragMoved = false
  let touchId: number | undefined
  let touchDialogId: number | undefined
  let touchLastY = 0
  let touchStartX = 0
  let touchStartY = 0
  let touchTarget: HTMLElement | undefined
  let previousOverflow = ''

  const backdropOpacity = computed(() => Math.max(0, 1 - Math.max(0, dragY.value) / dismissDistance.value))
  const topId = (): number | undefined => props.dialog.stack.at(-1)?.id

  function beginDrag(id: number, clientY: number, target: HTMLElement): void {
    draggedId.value = id
    isDragging.value = true
    const layer = target.parentElement
    const panel = layer?.querySelector('[data-dialog-panel]')
    const panelTop = panel?.getBoundingClientRect().top
    dismissDistance.value =
      panelTop === undefined ? 320 : Math.max(1, Math.ceil(window.innerHeight - panelTop) + 1)
    startY = clientY
    dragMoved = false
    dragY.value = 0
  }

  function clearGesture(): void {
    if (settleTimer !== undefined) {
      window.clearTimeout(settleTimer)
      settleTimer = undefined
    }
    draggedId.value = undefined
    dragY.value = 0
    isDragging.value = false
    pointerId = undefined
    pointerDialogId = undefined
    touchId = undefined
    touchDialogId = undefined
    touchTarget = undefined
  }

  function endDrag(event: PointerEvent): void {
    if (event.pointerId !== pointerId) {
      return
    }
    pointerId = undefined
    pointerDialogId = undefined
    if (draggedId.value !== undefined) {
      finishDrag(event.type === 'pointercancel', event.currentTarget as HTMLElement)
    }
  }

  function endTouch(event: TouchEvent): void {
    const touch = Array.from(event.changedTouches).find((item) => item.identifier === touchId)
    if (!touch) {
      return
    }
    touchId = undefined
    touchDialogId = undefined
    touchTarget = undefined
    if (draggedId.value !== undefined) {
      finishDrag(event.type === 'touchcancel', event.currentTarget as HTMLElement)
    }
  }

  function finishDrag(cancelled: boolean, target: HTMLElement): void {
    if (dragMoved) {
      suppressBackdropClickUntil = performance.now() + 400
    }
    const id = draggedId.value
    const layer = target.parentElement
    const shouldDismiss = !cancelled && dragY.value > 100 && id !== undefined
    isDragging.value = false
    nextTick(() => {
      if (draggedId.value !== id) {
        return
      }
      layer?.querySelector('[data-dialog-panel]')?.getBoundingClientRect()
      dragY.value = shouldDismiss ? Math.max(dragY.value, dismissDistance.value) : 0
      settleTimer = window.setTimeout(() => {
        if (shouldDismiss && id !== undefined) {
          props.dialog.close(id)
          return
        }
        clearGesture()
      }, 320)
    })
  }

  function moveDrag(event: PointerEvent): void {
    if (event.pointerId !== pointerId) {
      return
    }
    if (draggedId.value === undefined && pointerDialogId !== undefined) {
      const distanceY = event.clientY - pointerStartY
      if (Math.abs(distanceY) <= 4 || Math.abs(event.clientX - pointerStartX) > Math.abs(distanceY)) {
        return
      }
      beginDrag(pointerDialogId, pointerStartY, event.currentTarget as HTMLElement)
      ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
    }
    updateDrag(event.clientY)
  }

  function moveTouch(event: TouchEvent): void {
    const touch = Array.from(event.changedTouches).find((item) => item.identifier === touchId)
    if (!touch || touchDialogId === undefined) {
      return
    }
    const deltaY = touch.clientY - touchLastY
    touchLastY = touch.clientY
    if (draggedId.value === touchDialogId) {
      event.preventDefault()
      updateDrag(touch.clientY)
      return
    }
    const totalY = touch.clientY - touchStartY
    if (Math.abs(totalY) <= 4 || Math.abs(touch.clientX - touchStartX) > Math.abs(totalY) || deltaY === 0) {
      return
    }
    const panel = (event.currentTarget as HTMLElement).parentElement?.querySelector('[data-dialog-panel]')
    if (!panel || !touchTarget) {
      return
    }
    const scrollables = scrollableAncestors(touchTarget, panel)
    const remaining = scrollables.reduce(
      (total, element) =>
        total + (deltaY > 0 ? element.scrollTop : element.scrollHeight - element.clientHeight - element.scrollTop),
      0,
    )
    if (remaining > 1) {
      return
    }
    event.preventDefault()
    beginDrag(touchDialogId, touch.clientY - deltaY, event.currentTarget as HTMLElement)
    updateDrag(touch.clientY)
  }

  function onAfterLeave(element: Element): void {
    if (Number((element as HTMLElement).dataset.dialogId) === draggedId.value) {
      clearGesture()
    }
  }

  function onBackdropClick(id: number): void {
    if (performance.now() < suppressBackdropClickUntil) {
      return
    }
    if (id === topId() && props.dialog.stack.at(-1)?.options.closeOnBackdrop) {
      props.dialog.close(id)
    }
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && props.dialog.stack.at(-1)?.options.closeOnEscape) {
      event.preventDefault()
      props.dialog.close()
    }
  }

  function scrollableAncestors(target: HTMLElement, panel: Element): HTMLElement[] {
    const ancestors: HTMLElement[] = []
    let current: HTMLElement | null = target
    while (current && panel.contains(current)) {
      const overflowY = window.getComputedStyle(current).overflowY
      if (/auto|scroll|overlay/u.test(overflowY) && current.scrollHeight > current.clientHeight + 1) {
        ancestors.push(current)
      }
      current = current.parentElement
    }
    return ancestors
  }

  function startDrag(event: PointerEvent, id: number): void {
    if (
      event.pointerType === 'touch' ||
      !event.isPrimary ||
      event.button !== 0 ||
      id !== topId() ||
      draggedId.value !== undefined ||
      resolvePlacement(props.dialog.stack.at(-1)?.options.placement ?? 'center') !== 'bottom'
    ) {
      return
    }
    pointerId = event.pointerId
    pointerDialogId = id
    pointerStartX = event.clientX
    pointerStartY = event.clientY
  }

  function startTouch(event: TouchEvent, id: number): void {
    if (
      touchId !== undefined ||
      draggedId.value !== undefined ||
      id !== topId() ||
      resolvePlacement(props.dialog.stack.at(-1)?.options.placement ?? 'center') !== 'bottom'
    ) {
      return
    }
    const touch = event.changedTouches[0]
    if (!touch) {
      return
    }
    touchId = touch.identifier
    touchDialogId = id
    touchStartX = touch.clientX
    touchStartY = touch.clientY
    touchLastY = touch.clientY
    touchTarget = event.target as HTMLElement
    if (
      touchTarget.closest('[data-dialog-handle]') ||
      (event.currentTarget as HTMLElement).hasAttribute('data-dialog-backdrop')
    ) {
      beginDrag(id, touch.clientY, event.currentTarget as HTMLElement)
    }
  }

  function updateDrag(clientY: number): void {
    const distance = clientY - startY
    dragMoved ||= Math.abs(distance) > 4
    dragY.value = distance < 0 ? -72 * (1 - Math.exp(distance / 120)) : distance
  }

  watch(
    () => props.dialog.stack.length,
    (length) => {
      if (length) {
        if (!previousOverflow) {
          previousOverflow = document.body.style.overflow || 'auto'
        }
        document.body.style.overflow = 'hidden'
      } else if (previousOverflow) {
        document.body.style.overflow = previousOverflow === 'auto' ? '' : previousOverflow
        previousOverflow = ''
      }
    },
  )

  onMounted(() => document.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown)
    clearGesture()
    if (previousOverflow) {
      document.body.style.overflow = previousOverflow === 'auto' ? '' : previousOverflow
    }
  })
</script>

<template>
  <Teleport to="body">
    <TransitionGroup
      :enterActiveClass="UI_STYLE.animation.enterActive"
      :enterFromClass="UI_STYLE.animation.enterFrom"
      :leaveActiveClass="UI_STYLE.animation.leaveActive"
      :leaveToClass="UI_STYLE.animation.leaveTo"
      @afterLeave="onAfterLeave"
    >
      <div
        v-for="(entry, index) in dialog.stack"
        :key="entry.id"
        :data-dialog-id="entry.id"
        :class="[UI_STYLE.layer, placementClasses[resolvePlacement(entry.options.placement)]]"
        :data-placement="resolvePlacement(entry.options.placement)"
        :style="{ zIndex: 1000 + index * 2 }"
      >
        <div
          :class="[UI_STYLE.backdrop, entry.id === draggedId && !isDragging && UI_STYLE.animation.backdropSettle]"
          data-dialog-backdrop
          aria-hidden="true"
          :style="entry.id === draggedId ? { opacity: backdropOpacity } : undefined"
          @click="onBackdropClick(entry.id)"
          @pointerdown="startDrag($event, entry.id)"
          @pointermove="moveDrag"
          @pointerup="endDrag"
          @pointercancel="endDrag"
          @touchstart="startTouch($event, entry.id)"
          @touchmove="moveTouch"
          @touchend="endTouch"
          @touchcancel="endTouch"
        />
        <Dialog
          :placement="resolvePlacement(entry.options.placement)"
          :rubberBand="entry.options.rubberBand"
          :dragY="entry.id === draggedId ? dragY : 0"
          :settling="entry.id === draggedId && !isDragging"
          :class="entry.id === draggedId && !isDragging ? UI_STYLE.animation.panelSettle : undefined"
          @pointerdown="startDrag($event, entry.id)"
          @pointermove="moveDrag"
          @pointerup="endDrag"
          @pointercancel="endDrag"
          @touchstart="startTouch($event, entry.id)"
          @touchmove="moveTouch"
          @touchend="endTouch"
          @touchcancel="endTouch"
        >
          <component
            :is="entry.component"
            v-bind="entry.props"
          />
        </Dialog>
      </div>
    </TransitionGroup>
  </Teleport>
</template>
