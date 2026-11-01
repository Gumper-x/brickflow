# Dialogs

The Nuxt module auto-imports `useDialog()`. Pass a component and its required props to `open`. Each call adds a layer above the previous dialog.

```ts
const dialog = useDialog()
const handle = dialog.open(LazySomeUserDialog, { text: 'test', userId: 42 })

handle.close() // closes this dialog
dialog.close() // closes the top dialog
dialog.closeAll() // closes every dialog

dialog.open(LazySomeUserDialog, { text: 'test', userId: 42 }, { placement: 'bottom' })
dialog.open(LazySomeUserDialog, { text: 'test', userId: 42 }, { placement: 'fullscreen' })
```

Dialogs appear centered by default. Set `placement: 'bottom'` to show a bottom sheet or `placement: 'fullscreen'` to fill the viewport. The default and per-dialog placement can also be responsive:

```ts
dialog: {
  placement: { dk: 'center', lp: 'center', mb: 'bottom', ms: 'bottom', tb: 'center' },
}
```

The screen ranges are `dk` (1440 px and wider), `lp` (1024–1439 px), `tb` (768–1023 px), `mb` (480–767 px), and `ms` (under 480 px). A responsive placement must specify all five ranges. Each range can use `center`, `bottom`, or `fullscreen`. Drag a bottom sheet down from its handle, backdrop, or content to close it. Scrollable content scrolls normally; once it reaches an edge, dragging can move the sheet. The content component needs one root element so dialog layout and elastic-height classes can apply to it. It controls its own scrolling with `overflow-y-auto` and `min-h-0`. Upward dragging has elastic resistance in both modes. By default, it stretches the content; set `elasticHeight: false` in `uiConfig.dialog` to move the whole sheet upward with the same resistance. Set `preventClose: true` to keep the dialog open when the user clicks the backdrop, presses Escape, or swipes down; the panel shakes to indicate that an explicit action is required. All dialog styles live under `uiStyles.dialog`, including `panelPlacementClasses` and `layerPlacementClasses`.

The UI playground includes runnable examples for placement and motion, a form with explicit dismissal that returns a value, long scrolling content, and a stack of dialogs. Each example uses `dialog.open(Component, props, options)`, with its content in a separate component so the same pattern works in an application.

For a confirmation, pass a callback as a prop and disable backdrop and Escape closing when the user must choose an action:

```ts
dialog.open(
  LazyConfirmDialog,
  { onConfirm: () => deleteDraft(draftId), title: 'Delete draft?' },
  { preventClose: true },
)
```

In the content component, call the callback only from the confirm button, then call `dialog.close()`. A form can pass an `onSave` callback the same way. Keep its input state in the content component and call `dialog.close()` after saving.

For long content, put the scroll styles on the content component, not the dialog shell:

```vue
<template>
  <div class="min-h-0 overflow-y-auto">
    <!-- Long content -->
  </div>
</template>
```
