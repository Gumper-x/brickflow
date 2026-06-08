import type { Ref } from 'vue'

import { createHttp, type HttpClient } from '@brickflow/http'
import { createGet as createHttpGet, createUseHttp } from '@brickflow/http/nuxt'

export const DIRECT_BASE_URL = 'https://dummyjson.com'
export const PROXY_BASE_URL = '/api/dummyjson'
export const PLAYGROUND_HTTP_BASE_URL_KEY = 'playground-http-base-url'
export const HTTP_CACHE_TTL = 1000 * 60 * 10

export function createRuntimeHttpClient(): HttpClient {
  const apiBaseUrl = usePlaygroundBaseUrl()

  function resolveClient(): HttpClient {
    return createHttp({
      baseURL: apiBaseUrl.value,
      headers: {
        'X-Playground-Http': 'playground-runtime',
      },
    })
  }

  return {
    get(url, config) {
      return resolveClient().get(url, config)
    },
    post(url, data, config) {
      return resolveClient().post(url, data, config)
    },
  }
}

export function usePlaygroundBaseUrl(): Ref<string> {
  return useState(PLAYGROUND_HTTP_BASE_URL_KEY, () => DIRECT_BASE_URL)
}

const localHttp = createHttp({
  baseURL: '',
  headers: {
    'X-Playground-Http': 'playground-local',
  },
})

const useRuntimeHttp = createUseHttp({
  getHttpClient: () => useNuxtApp().$http,
  isDev: () => import.meta.dev,
  ttl: HTTP_CACHE_TTL,
})

const useLocalHttp = createUseHttp({
  getHttpClient: () => localHttp,
  isDev: () => import.meta.dev,
})

export const createGet = createHttpGet(useRuntimeHttp)
export const createLocalGet = createHttpGet(useLocalHttp)
