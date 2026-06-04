import { useLazyAsyncData, useNuxtApp, useRuntimeConfig, useState } from 'nuxt/app'
import { onScopeDispose, type ShallowReactive, shallowReactive, shallowRef } from 'vue'

import type {
  HttpRouteData,
  HttpRouteError,
  HttpRouteMap,
  HttpRouteParams,
  ResolveHttpRoute,
} from '../utils/typed'

import { dbDeleteKeysWithPart, dbGet, dbSafeSet, getRandom, hashData } from '../utils'
import {
  createHttpUrl,
  createNetworkError,
  type HttpErrorPayload,
  type HttpParam,
  type HttpPayload,
  type HttpRuntimeConfig,
  isHttpErrorPayload,
} from '../utils/shared'

type BroadcastMessage<TParams extends HttpParam = HttpParam> = {
  data: unknown
  fullUrl: string
  params: TParams
  type: 'STATE_UPDATE'
}

type UseHttpState<TData, TError extends HttpErrorPayload, TParams extends HttpParam> = ShallowReactive<{
  data: null | TData
  error: null | TError
  fetch: (params?: TParams, opt?: { signal: AbortSignal }) => Promise<void>
  hasFirstData: boolean
  hasFreshData: boolean
  pending: boolean
  pendingCache: boolean
}>

const CHANNEL_NAME = 'brickflow-http-tab-sync'
let channel: BroadcastChannel | undefined

export async function useHttp<TUrl extends Extract<keyof HttpRouteMap, string>>(options: {
  effect?: (
    payload: HttpPayload<
      HttpRouteData<ResolveHttpRoute<HttpRouteMap, TUrl>>,
      HttpRouteError<ResolveHttpRoute<HttpRouteMap, TUrl>>
    >,
    config: {
      cached: boolean
      params: HttpRouteParams<ResolveHttpRoute<HttpRouteMap, TUrl>>
    },
  ) => undefined | void
  initParams?: HttpRouteParams<ResolveHttpRoute<HttpRouteMap, TUrl>>
  lazy?: true
  mapParams?: <TMapped extends HttpRouteParams<ResolveHttpRoute<HttpRouteMap, TUrl>>>(params?: TMapped) => TMapped
  server?: boolean
  url: TUrl
}): Promise<
  UseHttpState<
    HttpRouteData<ResolveHttpRoute<HttpRouteMap, TUrl>>,
    HttpRouteError<ResolveHttpRoute<HttpRouteMap, TUrl>>,
    HttpRouteParams<ResolveHttpRoute<HttpRouteMap, TUrl>>
  >
>
export async function useHttp<
  TData = unknown,
  TParams extends HttpParam = HttpParam,
  TError extends HttpErrorPayload = HttpErrorPayload,
>(options: {
  effect?: (
    payload: HttpPayload<TData, TError>,
    config: {
      cached: boolean
      params: TParams
    },
  ) => undefined | void
  initParams?: TParams
  lazy?: true
  mapParams?: <TMapped extends TParams>(params?: TMapped) => TMapped
  server?: boolean
  url: string
}): Promise<UseHttpState<TData, TError, TParams>> {
  const app = useNuxtApp()
  const runtimeConfig = useRuntimeConfig()
  const httpConfig = runtimeConfig.public.brickflowHttp as HttpRuntimeConfig

  const mapParams = (params?: TParams): TParams => {
    if (options.mapParams) {
      return options.mapParams(params ?? ({} as TParams))
    }

    return (params ?? {}) as TParams
  }

  const cacheEnabled = httpConfig.cache && !(httpConfig.disableCacheInDev && import.meta.dev)
  const initFullUrl = createHttpUrl(options.url, mapParams(options.initParams))
  let hasDataFromServer = false

  const result = shallowReactive({
    data: null,
    error: null,
    fetch: async () => await undefined,
    hasFirstData: false,
    hasFreshData: false,
    pending: true,
    pendingCache: true,
  }) as UseHttpState<TData, TError, TParams>

  const controller = new AbortController()
  const serverData = useState<HttpPayload<TData, TError> | null>(`http:${initFullUrl}`, () => null)

  if (options.server && import.meta.server) {
    const paramsReactive = shallowRef(mapParams(options.initParams))
    const ssr = await useLazyAsyncData(initFullUrl, async () => {
      return await app.$http.get<TData, TParams, TError>(options.url, {
        params: paramsReactive.value,
      })
    })

    result.fetch = async (params?: TParams) => {
      paramsReactive.value = mapParams(params)
      await ssr.refresh()
    }

    const payload = ssr.data.value?.data ?? null
    serverData.value = payload

    if (payload === null) {
      result.pending = false
      result.pendingCache = false
    } else {
      applyPayload(payload, result)
      result.hasFirstData = true
      result.hasFreshData = true
      result.pending = false
      result.pendingCache = false

      options.effect?.(payload, {
        cached: false,
        params: mapParams(options.initParams),
      })

      if (!isHttpErrorPayload(payload)) {
        hasDataFromServer = true
      }
    }
  }

  if (import.meta.client) {
    const fullUrlHistory: Record<string, true> = {}
    const clientChannel = getChannel()

    function onMessage(event: MessageEvent<Partial<BroadcastMessage<TParams>>>): void {
      if (!event.data.fullUrl || !fullUrlHistory[event.data.fullUrl] || event.data.data === undefined) {
        return
      }

      const payload = event.data.data as HttpPayload<TData, TError>
      applyPayload(payload, result)
      result.hasFirstData = true
      result.hasFreshData = true

      options.effect?.(payload, {
        cached: false,
        params: (event.data.params ?? mapParams()) as TParams,
      })
    }

    clientChannel?.addEventListener('message', onMessage)

    if (serverData.value !== null) {
      applyPayload(serverData.value, result)
      result.pending = false
      result.pendingCache = false
      result.hasFirstData = true
      result.hasFreshData = true
    }

    const raceCondition: Record<string, number> = {}

    const runFetch = async (params?: TParams, fetchOpt?: { signal?: AbortSignal }): Promise<void> => {
      const mappedParams = mapParams(params)
      const fullUrl = createHttpUrl(options.url, mappedParams)
      const fetchId = Date.now() + getRandom(0, 300)

      if (raceCondition[fullUrl]) {
        return
      }

      raceCondition[fullUrl] = fetchId

      try {
        result.pending = true
        result.pendingCache = true

        const cachedFetch =
          cacheEnabled && httpConfig.cacheDbName && httpConfig.cacheStoreName
            ? await dbGet<HttpPayload<TData, TError>>(fullUrl, 'smart-cache-v2', httpConfig.cacheStoreName)
            : null

        if (cachedFetch) {
          applyPayload(cachedFetch.value, result)
          result.hasFirstData = true
          result.pendingCache = false

          options.effect?.(cachedFetch.value, {
            cached: true,
            params: mappedParams,
          })
        }

        if (controller.signal.aborted || fetchOpt?.signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError')
        }

        const signal = fetchOpt?.signal ? [controller.signal, fetchOpt.signal] : controller.signal
        const response = await app.$http.get<TData, TParams, TError>(options.url, {
          params: mappedParams,
          signal,
        })

        applyPayload(response.data, result)
        result.hasFirstData = true
        result.hasFreshData = true

        fullUrlHistory[fullUrl] = true

        clientChannel?.postMessage({
          data: normalizeBroadcastValue(response.data),
          fullUrl,
          params: normalizeBroadcastValue(mappedParams),
          type: 'STATE_UPDATE',
        } satisfies BroadcastMessage<TParams>)

        options.effect?.(response.data, {
          cached: false,
          params: mappedParams,
        })

        if (cacheEnabled && response.status === 200) {
          if (cachedFetch !== null) {
            const currentHash = await hashData(response.data)
            if (currentHash !== cachedFetch.hash) {
              await dbDeleteKeysWithPart(options.url, 'smart-cache-v2', httpConfig.cacheStoreName)
            }
          }

          await dbSafeSet(
            fullUrl,
            response.data,
            'smart-cache-v2',
            httpConfig.cacheStoreName,
            httpConfig.cacheTtlMs,
          )
        }
      } catch (error) {
        if (!isHttpErrorPayload(result.error)) {
          result.error = createNetworkError(error) as TError
        }
      } finally {
        if (raceCondition[fullUrl] === fetchId) {
          delete raceCondition[fullUrl]
        }

        result.pending = false
        result.pendingCache = false
      }
    }

    result.fetch = runFetch

    if (!hasDataFromServer && options.lazy !== true) {
      await runFetch(options.initParams)
    }

    onScopeDispose(() => {
      clientChannel?.removeEventListener('message', onMessage)
      controller.abort(`Http Abort -> onScopeDispose ${options.url}`)

      if (serverData.value !== null) {
        serverData.value = null
      }
    })
  }

  return result
}

function applyPayload<TData, TError extends HttpErrorPayload, TParams extends HttpParam>(
  payload: HttpPayload<TData, TError>,
  result: UseHttpState<TData, TError, TParams>,
): void {
  if (isHttpErrorPayload(payload)) {
    result.data = null
    result.error = payload as TError
    return
  }

  result.data = payload as TData
  result.error = null
}

function getChannel(): BroadcastChannel | undefined {
  if (!import.meta.client) {
    return undefined
  }

  channel ??= new BroadcastChannel(CHANNEL_NAME)
  return channel
}

function normalizeBroadcastValue<T>(payload: T): T {
  try {
    return structuredClone(payload)
  } catch {
    return JSON.parse(JSON.stringify(payload)) as T
  }
}
