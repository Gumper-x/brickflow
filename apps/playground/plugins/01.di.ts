import { createRuntimeHttpClient } from '../core/util'
import { createPlaygroundDi } from '../domains'

export default defineNuxtPlugin(() => {
  const httpClient = createRuntimeHttpClient()

  return {
    provide: {
      di: createPlaygroundDi({
        httpClient,
      }),
      http: httpClient,
    },
  }
})
