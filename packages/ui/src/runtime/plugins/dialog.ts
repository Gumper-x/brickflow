import { defineNuxtPlugin } from 'nuxt/app'
import { createVNode, render } from 'vue'

import { uiConfig } from '#brickflow-ui'

import DialogHost from '../components/Dialog/Host.vue'
import { createDialogController, dialogKey } from '../composables/useDialog'

export default defineNuxtPlugin((nuxtApp) => {
  const dialog = createDialogController({
    placement: uiConfig.dialog.placement,
    rubberBand: (uiConfig.dialog as { rubberBand?: boolean }).rubberBand,
  })
  nuxtApp.vueApp.provide(dialogKey, dialog)

  if (import.meta.client) {
    nuxtApp.hook('app:mounted', () => {
      const mountPoint = document.createElement('div')
      mountPoint.id = 'brickflow-dialog-host'
      document.body.appendChild(mountPoint)
      const vnode = createVNode(DialogHost, { dialog })
      vnode.appContext = nuxtApp.vueApp._context
      render(vnode, mountPoint)
    })
  }
})
