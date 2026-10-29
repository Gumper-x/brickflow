import { type Component, inject, type InjectionKey, markRaw, reactive } from 'vue'

import type { ScreenKey } from './useScreen'

export interface DialogController {
  close(id?: number): void
  closeAll(): void
  open<C extends Component>(component: C, props: DialogProps<C>, options?: DialogOptions): DialogHandle
  readonly stack: DialogEntry[]
}

export interface DialogEntry {
  component: Component
  id: number
  options: Required<DialogOptions>
  props: Record<string, unknown>
}

export interface DialogHandle {
  close: () => void
  id: number
}

export interface DialogOptions {
  /** Allow closing by clicking the backdrop. Defaults to true. */
  closeOnBackdrop?: boolean
  /** Allow closing with Escape. Defaults to true. */
  closeOnEscape?: boolean
  /** Dialog position, optionally overridden for each screen range. Defaults to center. */
  placement?: DialogPlacementConfig
  /** Stretch the bottom sheet when dragging upward. Defaults to true. */
  rubberBand?: boolean
}

export type DialogPlacement = 'bottom' | 'center' | 'fullscreen'
export type DialogPlacementConfig = DialogPlacement | Record<ScreenKey, DialogPlacement>

type DialogProps<C> = C extends new (...args: never[]) => { $props: infer P }
  ? Omit<P, 'class' | 'key' | 'ref' | 'style'>
  : Record<string, unknown>

export const dialogKey: InjectionKey<DialogController> = Symbol('brickflow-dialog')

export function createDialogController(defaultOptions: DialogOptions = {}): DialogController {
  const stack = reactive<DialogEntry[]>([])
  let nextId = 0

  return {
    close(id) {
      const index = id === undefined ? stack.length - 1 : stack.findIndex((entry) => entry.id === id)
      if (index !== -1) {
        stack.splice(index, 1)
      }
    },
    closeAll() {
      stack.splice(0)
    },
    open(component, props, options = {}) {
      nextId += 1
      const id = nextId
      stack.push({
        component: markRaw(component),
        id,
        options: {
          closeOnBackdrop: options.closeOnBackdrop ?? true,
          closeOnEscape: options.closeOnEscape ?? true,
          placement: options.placement ?? defaultOptions.placement ?? 'center',
          rubberBand: options.rubberBand ?? defaultOptions.rubberBand ?? true,
        },
        props: { ...props },
      })
      return { close: () => this.close(id), id }
    },
    stack,
  }
}

export function useDialog(): DialogController {
  const dialog = inject(dialogKey, undefined)
  if (!dialog) {
    throw new Error('useDialog() requires the @brickflow/ui Nuxt module')
  }
  return dialog
}
