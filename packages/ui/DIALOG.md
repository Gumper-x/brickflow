# Dialogs

The Nuxt module auto-imports `useDialog()`. Pass a component and its required props to `open`. Each call adds a layer above the previous dialog.

```ts
const dialog = useDialog()
const handle = dialog.open(LazySomeUserDialog, { text: 'test', userId: 42 })

handle.close() // closes this dialog
dialog.close() // closes the top dialog
dialog.closeAll() // closes every dialog

dialog.open(LazySomeUserDialog, { text: 'test', userId: 42 }, { placement: 'bottom' })
dialog.open(LazySomeUserDialog, { text: 'test', userId: 42 }, { placement: 'bottom', rubberBand: false })
dialog.open(LazySomeUserDialog, { text: 'test', userId: 42 }, { placement: 'fullscreen' })
```

Dialogs appear centered by default. Set `placement: 'bottom'` to show a bottom sheet or `placement: 'fullscreen'` to fill the viewport. The default and per-dialog placement can also be responsive:

```ts
dialog: {
  placement: { dk: 'center', lp: 'center', mb: 'bottom', ms: 'bottom', tb: 'center' },
}
```

The screen ranges are `dk` (1440 px and wider), `lp` (1024–1439 px), `tb` (768–1023 px), `mb` (480–767 px), and `ms` (under 480 px). A responsive placement must specify all five ranges. Each range can use `center`, `bottom`, or `fullscreen`. Drag a bottom sheet down from its handle, backdrop, or content to close it. Scrollable content scrolls normally until it reaches an edge, then the remaining swipe moves the sheet. Upward dragging has elastic resistance in both modes. By default, it stretches the content; set `rubberBand: false` in `uiConfig.dialog` or per dialog to move the whole sheet upward with the same resistance. Backdrop and Escape closing can be disabled with `closeOnBackdrop: false` and `closeOnEscape: false`. Placement styles live in `uiStyles.dialog.placementClasses` and `uiStyles.host.placementClasses`.
