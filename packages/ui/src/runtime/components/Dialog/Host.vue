<script setup lang="ts">
  import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

  import type {
    DialogController,
    DialogEntry,
    DialogPlacement,
    DialogPlacementConfig,
  } from '../../composables/useDialog'

  import { useScreen } from '../../composables/useScreen'
  import Icon from '../Icon/index.vue'
  import Dialog, { dialogConfig } from './index.vue'

  const props = defineProps<{ dialog: DialogController }>()
  const screen = useScreen()
  const placementClasses = {
    bottom: UI_STYLE.layerPlacementClasses.bottom,
    center: UI_STYLE.layerPlacementClasses.center,
    fullscreen: UI_STYLE.layerPlacementClasses.fullscreen,
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
  const renderedDialogs = ref<
    {
      entry: DialogEntry
      loadingVisible: boolean
      ready: boolean
      visible: boolean
    }[]
  >([])
  const loadingTimers = new Map<number, number>()
  const draggedId = ref<number>()
  const dismissDistance = ref(320)
  const isDragging = ref(false)
  let startY = 0
  let dragFrame: number | undefined
  let pendingDragY = 0
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
  let focusObserver: MutationObserver | undefined
  let deniedAnimation: Animation | undefined
  const completedLeaves = new Map<number, Set<'backdrop' | 'panel'>>()
  const focusOrigins = new Map<number, HTMLElement>()

  const backdropOpacity = computed(() => Math.max(0, 1 - Math.max(0, dragY.value) / dismissDistance.value))
  const topId = (): number | undefined => props.dialog.stack.at(-1)?.id

  function beginDrag(id: number, clientY: number, target: HTMLElement): void {
    draggedId.value = id
    isDragging.value = true
    window.getSelection()?.removeAllRanges()
    const layer = target.parentElement
    const panel = layer?.querySelector('[data-dialog-panel]')
    const panelTop = panel?.getBoundingClientRect().top
    dismissDistance.value =
      panelTop === undefined ? 320 : Math.max(1, Math.ceil(window.innerHeight - panelTop) + 1)
    startY = clientY
    dragMoved = false
    pendingDragY = 0
    dragY.value = 0
  }

  function clearGesture(): void {
    if (dragFrame !== undefined) {
      window.cancelAnimationFrame(dragFrame)
      dragFrame = undefined
    }
    pendingDragY = 0
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

  function denyClose(id: number): void {
    if (id !== topId() || !props.dialog.stack.at(-1)?.options.preventClose) {
      return
    }
    const panel = topPanel()
    if (!panel || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return
    }
    deniedAnimation?.cancel()
    deniedAnimation = panel.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-12px)' },
        { transform: 'translateX(10px)' },
        { transform: 'translateX(-7px)' },
        { transform: 'translateX(4px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 380, easing: 'ease-in-out' },
    )
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
    flushDrag()
    if (dragMoved) {
      suppressBackdropClickUntil = performance.now() + 400
    }
    const id = draggedId.value
    const layer = target.parentElement
    const shouldDismiss = !cancelled && dragY.value > 100 && id !== undefined
    const prevented = shouldDismiss && props.dialog.stack.at(-1)?.options.preventClose
    isDragging.value = false
    nextTick(() => {
      if (draggedId.value !== id) {
        return
      }
      layer?.querySelector('[data-dialog-panel]')?.getBoundingClientRect()
      dragY.value = shouldDismiss && !prevented ? Math.max(dragY.value, dismissDistance.value) : 0
      settleTimer = window.setTimeout(() => {
        if (shouldDismiss && id !== undefined) {
          if (prevented) {
            denyClose(id)
          } else {
            props.dialog.close(id)
            return
          }
        }
        clearGesture()
      }, 320)
    })
  }

  function flushDrag(): void {
    if (dragFrame !== undefined) {
      window.cancelAnimationFrame(dragFrame)
      dragFrame = undefined
      dragY.value = pendingDragY
    }
  }

  function focusableElements(panel: HTMLElement): HTMLElement[] {
    return Array.from(
      panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.getClientRects().length > 0)
  }

  function focusPanel(): void {
    const panel = topPanel()
    if (panel) {
      const first = focusableElements(panel)[0]
      if (first) {
        first.focus()
        return
      }
      panel.focus()
      focusObserver = new MutationObserver(() => {
        if (topPanel() !== panel || document.activeElement !== panel) {
          focusObserver?.disconnect()
          return
        }
        const next = focusableElements(panel)[0]
        if (next) {
          next.focus()
          focusObserver?.disconnect()
        }
      })
      focusObserver.observe(panel, { childList: true, subtree: true })
    }
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
    if (draggedId.value !== undefined) {
      event.preventDefault()
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

  function onAfterLeave(id: number, part: 'backdrop' | 'panel'): void {
    const completed = completedLeaves.get(id) ?? new Set<'backdrop' | 'panel'>()
    completed.add(part)
    if (completed.size < 2) {
      completedLeaves.set(id, completed)
      return
    }
    completedLeaves.delete(id)
    renderedDialogs.value = renderedDialogs.value.filter(({ entry }) => entry.id !== id)
    if (id === draggedId.value) {
      clearGesture()
    }
  }

  function onBackdropClick(id: number): void {
    if (performance.now() < suppressBackdropClickUntil) {
      return
    }
    if (id === topId()) {
      if (props.dialog.stack.at(-1)?.options.preventClose) {
        denyClose(id)
      } else {
        props.dialog.close(id)
      }
    }
  }

  function onBeforeBackdropLeave(element: Element): void {
    const backdrop = element as HTMLElement
    const id = Number(backdrop.parentElement?.dataset.dialogId)
    if (id === draggedId.value && backdropOpacity.value < 1) {
      backdrop.style.opacity = String(backdropOpacity.value)
    } else {
      backdrop.style.removeProperty('opacity')
    }
    removeStyleClasses(backdrop, UI_STYLE.animation.settleBackdrop)
  }

  function onBeforePanelLeave(element: Element): void {
    removeStyleClasses(element, UI_STYLE.animation.settlePanel)
  }

  function onContentResolved(id: number): void {
    const rendered = renderedDialogs.value.find(({ entry }) => entry.id === id)
    if (rendered) {
      rendered.ready = true
    }
    stopLoading(id)
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      const panel = topPanel()
      if (panel) {
        const focusables = focusableElements(panel)
        const first = focusables[0] ?? panel
        const last = focusables.at(-1) ?? panel
        if (!panel.contains(document.activeElement) || document.activeElement === panel) {
          event.preventDefault()
          ;(event.shiftKey ? last : first).focus()
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    const topEntry = props.dialog.stack.at(-1)
    if (event.key === 'Escape' && topEntry) {
      event.preventDefault()
      if (topEntry.options.preventClose) {
        denyClose(topEntry.id)
      } else {
        props.dialog.close()
      }
    }
  }

  function panelHiddenClass(placement: DialogPlacement): string {
    return placement === 'bottom' ? UI_STYLE.animation.bottomPanelHidden : UI_STYLE.animation.panelHidden
  }

  function removeStyleClasses(element: Element, classes: string): void {
    element.classList.remove(...classes.split(' '))
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
      (event.target instanceof Element && event.target.closest('input, textarea, [contenteditable]')) ||
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

  function startLoadingTimer(id: number): void {
    if (typeof window === 'undefined') {
      return
    }
    const timer = window.setTimeout(() => {
      loadingTimers.delete(id)
      const rendered = renderedDialogs.value.find(({ entry }) => entry.id === id)
      if (rendered?.visible && !rendered.ready) {
        rendered.loadingVisible = true
      }
    }, dialogConfig.loadingDelay)
    loadingTimers.set(id, timer)
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

  function stopLoading(id: number): void {
    const timer = loadingTimers.get(id)
    if (timer !== undefined) {
      clearTimeout(timer)
      loadingTimers.delete(id)
    }
    const rendered = renderedDialogs.value.find(({ entry }) => entry.id === id)
    if (rendered) {
      rendered.loadingVisible = false
    }
  }

  function topPanel(): HTMLElement | null {
    const id = topId()
    return id === undefined ? null : document.querySelector(`[data-dialog-id="${id}"] [data-dialog-panel]`)
  }

  function updateDrag(clientY: number): void {
    const distance = clientY - startY
    dragMoved ||= Math.abs(distance) > 4
    pendingDragY = distance < 0 ? -72 * (1 - Math.exp(distance / 120)) : distance
    if (dragFrame === undefined) {
      dragFrame = window.requestAnimationFrame(() => {
        dragFrame = undefined
        dragY.value = pendingDragY
      })
    }
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

  watch(
    () => props.dialog.stack.map((entry) => entry.id),
    (ids, previousIds) => {
      focusObserver?.disconnect()
      const added = ids.find((id) => !previousIds.includes(id))
      if (added !== undefined && document.activeElement instanceof HTMLElement) {
        focusOrigins.set(added, document.activeElement)
      }
      const removed = previousIds.filter((id) => !ids.includes(id))
      const restoreId = ids.length ? previousIds.at(-1) : previousIds[0]
      const restore = restoreId === undefined ? undefined : focusOrigins.get(restoreId)
      for (const id of removed) {
        focusOrigins.delete(id)
      }
      nextTick(() => {
        if (ids.length) {
          if (removed.length && restore?.isConnected && topPanel()?.contains(restore)) {
            restore.focus()
          } else {
            focusPanel()
          }
        } else if (restore?.isConnected) {
          restore.focus()
        }
      })
    },
  )

  watch(
    () => props.dialog.stack.map((entry) => entry.id),
    (ids) => {
      for (const rendered of renderedDialogs.value) {
        if (!ids.includes(rendered.entry.id)) {
          rendered.visible = false
          stopLoading(rendered.entry.id)
          if (!rendered.ready) {
            onAfterLeave(rendered.entry.id, 'panel')
          }
        }
      }
      for (const entry of props.dialog.stack) {
        if (!renderedDialogs.value.some((rendered) => rendered.entry.id === entry.id)) {
          renderedDialogs.value.push({ entry, loadingVisible: false, ready: false, visible: true })
          startLoadingTimer(entry.id)
        }
      }
    },
    { immediate: true },
  )

  onMounted(() => {
    document.addEventListener('keydown', onKeydown)
    for (const rendered of renderedDialogs.value) {
      if (!rendered.ready && !loadingTimers.has(rendered.entry.id)) {
        startLoadingTimer(rendered.entry.id)
      }
    }
  })
  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown)
    for (const timer of loadingTimers.values()) {
      clearTimeout(timer)
    }
    loadingTimers.clear()
    deniedAnimation?.cancel()
    focusObserver?.disconnect()
    clearGesture()
    if (previousOverflow) {
      document.body.style.overflow = previousOverflow === 'auto' ? '' : previousOverflow
    }
  })
</script>

<template>
  <Teleport to="body">
    <template
      v-for="({ entry, loadingVisible, visible }, index) in renderedDialogs"
      :key="entry.id"
    >
      <div
        :data-dialog-id="entry.id"
        :class="[
          UI_STYLE.layer,
          placementClasses[resolvePlacement(entry.options.placement)],
          entry.id === draggedId && isDragging && 'select-none',
        ]"
        :data-placement="resolvePlacement(entry.options.placement)"
        :style="{ zIndex: 1000 + index * 2 }"
      >
        <Transition
          appear
          :enterActiveClass="UI_STYLE.animation.backdropEnterActive"
          :enterFromClass="UI_STYLE.animation.backdropHidden"
          :leaveActiveClass="UI_STYLE.animation.backdropLeaveActive"
          :leaveToClass="UI_STYLE.animation.backdropHidden"
          @beforeLeave="onBeforeBackdropLeave"
          @afterLeave="onAfterLeave(entry.id, 'backdrop')"
        >
          <div
            v-if="visible"
            :class="[
              UI_STYLE.backdrop,
              entry.id === draggedId && !isDragging && UI_STYLE.animation.settleBackdrop,
            ]"
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
        </Transition>
        <Suspense @resolve="onContentResolved(entry.id)">
          <template #default>
            <Transition
              appear
              :enterActiveClass="UI_STYLE.animation.panelEnterActive"
              :enterFromClass="panelHiddenClass(resolvePlacement(entry.options.placement))"
              :leaveActiveClass="UI_STYLE.animation.panelLeaveActive"
              :leaveToClass="panelHiddenClass(resolvePlacement(entry.options.placement))"
              @beforeLeave="onBeforePanelLeave"
              @afterLeave="onAfterLeave(entry.id, 'panel')"
            >
              <Dialog
                v-if="visible"
                :placement="resolvePlacement(entry.options.placement)"
                :elasticHeight="entry.options.elasticHeight"
                :dragY="entry.id === draggedId ? dragY : 0"
                :class="entry.id === draggedId && !isDragging ? UI_STYLE.animation.settlePanel : undefined"
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
                  :class="[
                    UI_STYLE.content,
                    resolvePlacement(entry.options.placement) === 'bottom' &&
                      entry.options.elasticHeight &&
                      UI_STYLE.elasticHeightStretch,
                    entry.id === draggedId &&
                      !isDragging &&
                      entry.options.elasticHeight &&
                      UI_STYLE.animation.settleElasticHeight,
                  ]"
                />
              </Dialog>
            </Transition>
          </template>
        </Suspense>
        <Transition :name="dialogConfig.loadingIconTransition">
          <div
            v-if="loadingVisible"
            :class="UI_STYLE.loader"
            role="status"
          >
            <Icon
              :name="dialogConfig.loadingIconName"
              :class="UI_STYLE.loadingIcon"
              aria-hidden="true"
            />
            <span class="sr-only">Loading dialog</span>
          </div>
        </Transition>
      </div>
    </template>
  </Teleport>
</template>
