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
  options: Required<DialogOptions> & { elasticHeight: boolean }
  props: Record<string, unknown>
}

export interface DialogHandle {
  close: () => void
  /** Resolves after the dialog is closed and its leave animation has finished. */
  closed: Promise<void>
  id: number
}

export interface DialogOptions {
  /** Dialog position, optionally overridden for each screen range. Defaults to center. */
  placement?: DialogPlacementConfig
  /** Prevent backdrop, Escape, and swipe dismissal. Defaults to false. */
  preventClose?: boolean
}

export type DialogPlacement = 'bottom' | 'center' | 'fullscreen'
export type DialogPlacementConfig = DialogPlacement | Record<ScreenKey, DialogPlacement>

interface DialogHostState {
  rendered: Set<number>
  settle: (id: number) => void
}

type DialogProps<C> = C extends new (...args: never[]) => { $props: infer P }
  ? Omit<P, 'class' | 'key' | 'ref' | 'style'>
  : Record<string, unknown>

export const dialogKey: InjectionKey<DialogController> = Symbol('brickflow-dialog')

const hostStates = new WeakMap<DialogController, DialogHostState>()

export function createDialogController(
  defaultOptions: DialogOptions & { elasticHeight?: boolean } = {},
): DialogController {
  const stack = reactive<DialogEntry[]>([])
  const closedResolvers = new Map<number, () => void>()
  const rendered = new Set<number>()
  let nextId = 0

  function settle(id: number): void {
    rendered.delete(id)
    closedResolvers.get(id)?.()
    closedResolvers.delete(id)
  }

  function settleUnrendered(entries: DialogEntry[]): void {
    for (const entry of entries) {
      if (!rendered.has(entry.id)) {
        settle(entry.id)
      }
    }
  }

  const controller: DialogController = {
    close(id) {
      const index = id === undefined ? stack.length - 1 : stack.findIndex((entry) => entry.id === id)
      if (index !== -1) {
        settleUnrendered(stack.splice(index, 1))
      }
    },
    closeAll() {
      settleUnrendered(stack.splice(0))
    },
    open(component, props, options = {}) {
      nextId += 1
      const id = nextId
      const closed = new Promise<void>((resolve) => {
        closedResolvers.set(id, resolve)
      })
      stack.push({
        component: markRaw(component),
        id,
        options: {
          elasticHeight: defaultOptions.elasticHeight ?? true,
          placement: options.placement ?? defaultOptions.placement ?? 'center',
          preventClose: options.preventClose ?? defaultOptions.preventClose ?? false,
        },
        props: { ...props },
      })
      return { close: () => this.close(id), closed, id }
    },
    stack,
  }
  hostStates.set(controller, { rendered, settle })
  return controller
}

export function getDialogHostState(dialog: DialogController): DialogHostState {
  return hostStates.get(dialog) as DialogHostState
}

export function useDialog(): DialogController {
  const dialog = inject(dialogKey, undefined)
  if (!dialog) {
    throw new Error('useDialog() requires the @brickflow/ui Nuxt module')
  }
  return dialog
}
