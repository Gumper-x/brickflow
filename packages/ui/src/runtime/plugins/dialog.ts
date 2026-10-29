import { defineNuxtPlugin } from 'nuxt/app'
import { createVNode, render } from 'vue'

import DialogHost from '../components/Dialog/Host.vue'
import { dialogConfig } from '../components/Dialog/index.vue'
import { createDialogController, dialogKey } from '../composables/useDialog'

export default defineNuxtPlugin((nuxtApp) => {
  const dialog = createDialogController({
    placement: dialogConfig.placement,
    rubberBand: (dialogConfig as { rubberBand?: boolean }).rubberBand,
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
