import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'

import { createHttpClient } from './http/client'
import { type HttpResponse, type HttpRuntimeConfig, isHttpErrorPayload } from './utils/shared'

export default defineNuxtPlugin(() => {
  const runtimeConfig = useRuntimeConfig()
  const httpConfig = runtimeConfig.public.brickflowHttp as HttpRuntimeConfig

  const http = createHttpClient({
    baseURL: () => httpConfig.baseURL,
    createHeaders: () => {
      const headers = new Headers(httpConfig.defaultHeaders)

      headers.set('X-Requested-With', 'XMLHttpRequest')

      if (httpConfig.clientEnvHeader && import.meta.dev) {
        headers.set('Client-Env', 'development')
      }

      return headers
    },
    requestTimeoutMs: httpConfig.requestTimeoutMs,
    responseMiddleware: [createRuntimeHttpErrorMiddleware()],
    retry: httpConfig.retry,
  })

  return {
    provide: {
      http,
    },
  }
})

function createRuntimeHttpErrorMiddleware(): (response: HttpResponse) => Promise<void> | void {
  return (response: HttpResponse): void => {
    const { data, status } = response

    if ((status !== 451 && status < 500) || !isHttpErrorPayload(data)) {
      return
    }

    const raise = async (): Promise<void> => {
      const { showError } = await import('nuxt/app')

      showError({
        data,
        statusCode: status,
      })
    }

    const raiseSafely = (): void => {
      ;(async (): Promise<void> => {
        try {
          await raise()
        } catch (error) {
          console.error(error)
        }
      })()
    }

    if (import.meta.server) {
      raiseSafely()
      return
    }

    setTimeout(raiseSafely, 0)
  }
}
