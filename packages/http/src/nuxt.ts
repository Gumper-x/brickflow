import { useLazyAsyncData, useState } from 'nuxt/app'
import { onScopeDispose, shallowReactive, shallowRef } from 'vue'

import type { GetConfig, HttpClient, HttpErrorGuard, HttpKey, HttpParam, HttpResponseData } from './http'

import { createURL, hashData } from './utils'

const DAY = 1000 * 60 * 60 * 24
const DEFAULT_CHANNEL_NAME = 'http-tab-sync'
const DEFAULT_TTL = DAY * 7
export interface CreateUseHttpDependencies {
  channelName?: string
  getCache: () => null | UseHttpCache
  getHttpClient: () => HttpClient
  isDev?: () => boolean
  isError?: HttpErrorGuard<unknown>
  ttl?: number
}

export type HttpError = HttpErrorMap[keyof HttpErrorMap]
export interface HttpErrorMap {}
export type HttpSuccessData<TKey extends HttpKey = HttpKey> = Exclude<HttpResponseData<TKey>, HttpError>

export interface UseHttpCache {
  deleteKeysWithPart: (part: string) => Promise<void>
  get: <T>(key: string) => Promise<null | UseHttpCacheEntry<T>>
  set: <T>(key: string, value: T, ttl: number) => Promise<void>
}

export interface UseHttpCacheEntry<T> {
  hash: string
  value: T
}

export interface UseHttpFn {
  <T extends HttpKey, P extends HttpParam>(options: UseHttpOptions<T, P>): Promise<UseHttpResult<T, P>>
}

export interface UseHttpOptions<T extends HttpKey, P extends HttpParam> {
  effect?: UseHttpEffect<T, P>
  initParams?: P
  isError?: (payload: HttpResponseData<T>) => boolean
  lazy?: true
  mapParams?: (params?: P) => P
  server?: boolean
  url: T
}

export interface UseHttpResult<T extends HttpKey, P extends HttpParam> {
  data: HttpSuccessData<T> | null
  error: null | UseHttpError<T>
  fetch: UseHttpFetch<P>
  hasFirstData: boolean
  hasFreshData: boolean
  pending: boolean
  pendingCache: boolean
}

type BroadcastMessage = {
  data: unknown
  fullUrl: string
  params: HttpParam
  type: 'STATE_UPDATE'
}

type UseHttpEffect<T extends HttpKey, P extends HttpParam> = (
  data: HttpResponseData<T>,
  config: UseHttpEffectConfig<P>,
) => void
type UseHttpEffectConfig<P extends HttpParam> = {
  cached: boolean
  params: P
}
type UseHttpError<T extends HttpKey> = Extract<HttpResponseData<T>, HttpError>

type UseHttpFetch<P extends HttpParam> = (params?: P, opt?: { signal: AbortSignal }) => Promise<void>

export function createUseHttp(dependencies: CreateUseHttpDependencies): UseHttpFn {
  let channel: BroadcastChannel | null

  const useHttp: UseHttpFn = async <T extends HttpKey, P extends HttpParam>(
    options: UseHttpOptions<T, P>,
  ): Promise<UseHttpResult<T, P>> => {
    const mapParams = (params?: P): P => {
      if (options.mapParams) {
        return options.mapParams(params)
      }

      return params ?? ({} as P)
    }
    const effect = options.effect
    const isError = createIsErrorGuard(options.isError, dependencies.isError)

    const buildUrl = createURL
    const initFullUrl = buildUrl(options.url, mapParams(options.initParams))
    const httpClient = dependencies.getHttpClient()
    const cache = import.meta.client ? (dependencies.getCache?.() ?? null) : null
    let hasDataFromServer = false

    const result = shallowReactive({
      data: null as null | unknown,
      error: null as null | unknown,
      fetch: async (_params?: P, _opt?: { signal: AbortSignal }): Promise<void> => await undefined,
      hasFirstData: false,
      hasFreshData: false,
      pending: true,
      pendingCache: true,
    })
    const setError = (value: null | unknown): void => {
      result.error = value
    }
    const setData = (value: null | unknown): void => {
      result.data = value
    }
    const syncResult = (payload: HttpResponseData<T> | null | undefined): void => {
      if (payload === null || payload === undefined) {
        setData(null)
        setError(null)
        return
      }

      if (isError(payload)) {
        setData(null)
        setError(payload)
        return
      }

      setData(payload)
      setError(null)
    }

    const controller = new AbortController()
    const serverData = useState<null | unknown>(`http-${initFullUrl}`, () => null)

    if (options.server && import.meta.server) {
      const paramsReactive = shallowRef(mapParams(options.initParams))
      const ssr = await useLazyAsyncData(initFullUrl, async () => {
        return await httpClient.get<T>(options.url, {
          params: paramsReactive.value,
        } as GetConfig<T>)
      })

      result.fetch = async (params?: P) => {
        paramsReactive.value = mapParams(params)
        await ssr.refresh()
      }

      serverData.value = ssr.data.value?.data ?? null
      const serverPayload = serverData.value as HttpResponseData<T>
      syncResult(serverPayload)

      result.pending = false
      result.pendingCache = false
      result.hasFirstData = true
      result.hasFreshData = true

      if (serverData.value) {
        effect?.(serverData.value as HttpResponseData<T>, {
          cached: false,
          params: mapParams(options.initParams),
        })
      }

      if (result.data) {
        hasDataFromServer = true
      }
    }

    if (import.meta.client) {
      channel = getChannel(dependencies.channelName ?? DEFAULT_CHANNEL_NAME, channel)
      const fullUrlHistory: Record<string, true> = {}

      function onMessage(event: MessageEvent<Partial<BroadcastMessage>>): void {
        if (event.data.fullUrl && fullUrlHistory[event.data.fullUrl]) {
          const eventPayload = event.data.data as HttpResponseData<T> | undefined

          if (eventPayload) {
            effect?.(eventPayload, {
              cached: false,
              params: event.data.params as P,
            })
          }

          syncResult(eventPayload)

          result.hasFirstData = true
          result.hasFreshData = true
        }
      }

      channel?.addEventListener('message', onMessage)

      if (serverData.value) {
        const clientServerPayload = serverData.value as HttpResponseData<T>
        syncResult(clientServerPayload)
        result.pending = false
        result.pendingCache = false
        result.hasFirstData = true
        result.hasFreshData = true
      }

      const raceCondition: Record<string, number> = {}
      const ttl = dependencies.ttl ?? DEFAULT_TTL

      const runFetch = async (params?: P, fetchOpt?: { signal?: AbortSignal }): Promise<void> => {
        const mappedParams = mapParams(params)
        const fullUrl = buildUrl(options.url, mappedParams)
        const fetchId = Date.now() + getRandom(0, 300)

        if (raceCondition[fullUrl]) {
          console.info('Race Condition affect', fullUrl)
          return
        }

        raceCondition[fullUrl] = fetchId

        try {
          result.pending = true
          result.pendingCache = true

          const cachedFetch = cache && !dependencies.isDev?.() ? await cache.get<unknown>(fullUrl) : null

          if (cachedFetch) {
            const cachedPayload = cachedFetch.value as HttpResponseData<T>

            effect?.(cachedPayload, {
              cached: true,
              params: mappedParams,
            })

            syncResult(cachedPayload)
            result.hasFirstData = true

            result.pendingCache = false
          }

          if (controller.signal.aborted || fetchOpt?.signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError')
          }

          const signalHttp = fetchOpt?.signal ? [controller.signal, fetchOpt.signal] : controller.signal
          const response = await httpClient.get<T>(options.url, {
            params: mappedParams,
            signal: signalHttp,
          } as GetConfig<T>)
          const responsePayload = response.data as HttpResponseData<T>

          effect?.(responsePayload, {
            cached: false,
            params: mappedParams,
          })

          if (isError(responsePayload)) {
            syncResult(responsePayload)
          } else {
            syncResult(responsePayload)
            const successData = responsePayload

            fullUrlHistory[fullUrl] = true
            channel?.postMessage({
              data: normalizeBroadcastValue(successData),
              fullUrl,
              params: normalizeBroadcastValue(mappedParams),
              type: 'STATE_UPDATE',
            } satisfies BroadcastMessage)

            if (cache) {
              if (cachedFetch) {
                const newHash = await hashData(responsePayload)
                if (newHash !== cachedFetch.hash) {
                  await cache.deleteKeysWithPart(options.url)
                }
              }

              if (response.status === 200) {
                await cache.set(fullUrl, successData, ttl)
              }
            }
          }

          result.hasFirstData = true
          result.hasFreshData = true
        } catch (error) {
          console.error(error)
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
        runFetch(options.initParams)
      }

      onScopeDispose(() => {
        channel?.removeEventListener('message', onMessage)
        controller.abort(`Http Abort -> onScopeDispose ${options.url}`)

        if (serverData.value) {
          serverData.value = null
        }
      })
    }

    return result as UseHttpResult<T, P>
  }

  return useHttp
}

function createIsErrorGuard<TData>(
  localGuard?: (payload: TData) => boolean,
  globalGuard?: HttpErrorGuard<unknown>,
): (payload: TData) => boolean {
  if (localGuard) {
    return localGuard
  }

  if (globalGuard) {
    return globalGuard as (payload: TData) => boolean
  }

  return (): boolean => false
}

function getChannel(name: string, currentChannel?: BroadcastChannel | null): BroadcastChannel | null {
  if (currentChannel) {
    return currentChannel
  }

  if (import.meta.server || typeof BroadcastChannel !== 'function') {
    return null
  }

  return new BroadcastChannel(name)
}

function getRandom(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function normalizeBroadcastValue<T>(payload: T): T {
  try {
    return structuredClone(payload)
  } catch {
    return JSON.parse(JSON.stringify(payload)) as T
  }
}
