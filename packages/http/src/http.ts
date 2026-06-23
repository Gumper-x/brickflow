import { resolveUrlParams } from './utils'

export interface CreateHttpOptions {
  arrayMode?: HttpArrayMode
  baseURL: string
  fetch?: typeof fetch
  headers?: (() => HttpHeaders) | HttpHeaders
  onResponse?: (response: HttpAnyResponse) => Promise<void> | void
  timeout?: number
}

export type GetConfig<TKey extends HttpKey = HttpKey> = HttpConfigFull<TKey> & {
  retry?: {
    delay?: number
    retries?: number
  }
}

export type HttpAnyResponse = HttpResponse<HttpResponseData<HttpKey>, HttpKey, HttpConfigFull<HttpKey>>

export type HttpArrayMode = 'json' | 'repeat'
export type HttpClient = {
  get: <T extends HttpKey, TConfig extends GetConfig<T> = GetConfig<T>>(
    url: T,
    config?: TConfig,
  ) => Promise<HttpResponse<HttpResponseData<T>, T, TConfig>>
  post: <
    T extends HttpKey,
    TData extends Record<string, unknown> = Record<string, unknown>,
    TConfig extends PostConfig<T> = PostConfig<T>,
  >(
    url: T,
    data?: HttpPostData<TData>,
    config?: TConfig,
  ) => Promise<HttpResponse<HttpResponseData<T>, T, TConfig>>
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface HttpConfig<TKey extends HttpKey = HttpKey> {}

export interface HttpEndpoint {}
export type HttpErrorGuard<TData = unknown, TError extends TData = TData> = (payload: TData) => payload is TError
export type HttpKey = Extract<keyof HttpSchema, string>

export type HttpParam = Record<string, boolean | number | string | string[] | undefined>
export type HttpPostData<TData extends Record<string, unknown> = Record<string, unknown>> = FormData | TData

export interface HttpResponse<
  T = unknown,
  TKey extends HttpKey = HttpKey,
  TConfig extends HttpConfigFull<TKey> = HttpConfigFull<TKey>,
> {
  config: HttpResponseConfig<TKey, TConfig>
  data: T
  status: number
}
export type HttpResponseConfig<
  TKey extends HttpKey = HttpKey,
  TConfig extends HttpConfig<TKey> = HttpConfig<TKey>,
> = Omit<TConfig, 'signal'> & { url: string }

export type HttpResponseData<TKey extends HttpKey = HttpKey> = HttpSchema[TKey]

export type PostConfig<TKey extends HttpKey = HttpKey> = HttpConfigFull<TKey>

type HttpConfigFull<TKey extends HttpKey = HttpKey> = HttpConfig<TKey> & {
  params?: HttpParam
  signal?: AbortSignal | AbortSignal[]
}

type HttpHeaders = Record<string, string | undefined>

type HttpSchema = keyof HttpEndpoint extends never ? Record<string, unknown> : HttpEndpoint

export function createHttp(options: CreateHttpOptions): HttpClient {
  const arrayMode = options.arrayMode ?? 'json'
  const clientFetch = options.fetch ?? fetch
  const timeout = options.timeout ?? 80000

  return {
    get<T extends HttpKey, TConfig extends GetConfig<T> = GetConfig<T>>(url: T, config?: TConfig) {
      const requestConfig = (config ?? {}) as TConfig
      const resolved = resolveUrlParams(url, requestConfig.params)
      const requestUrl = `${joinUrl(options.baseURL, resolved.url)}${toQueryString(resolved.params, arrayMode)}`
      const { delay = 300, retries = 3 } = requestConfig.retry ?? {}

      const attemptRequest = async (attempt: number): Promise<HttpResponse<HttpResponseData<T>, T, TConfig>> => {
        try {
          const result = await clientFetch(requestUrl, {
            credentials: 'include',
            headers: resolveHeaders(options.headers),
            method: 'GET',
            signal: createSignal(requestConfig.signal, timeout),
          })

          const parsedResult = await result.json()
          const response: HttpResponse<HttpResponseData<T>, T, TConfig> = {
            config: createResponseConfig<T, TConfig>(joinUrl(options.baseURL, resolved.url), {
              ...requestConfig,
              params: resolved.params,
            }),
            data: parsedResult,
            status: result.status,
          }

          if (!result.ok && isRetryableStatus(result.status) && attempt < retries) {
            await wait(getRetryDelay(attempt, delay))
            return attemptRequest(attempt + 1)
          }

          await options.onResponse?.(response as HttpAnyResponse)
          return response
        } catch (err) {
          if (isAbortError(err) || attempt >= retries) {
            throw err
          }

          await wait(getRetryDelay(attempt, delay))
          return attemptRequest(attempt + 1)
        }
      }

      return attemptRequest(0)
    },
    async post<
      T extends HttpKey,
      TData extends Record<string, unknown> = Record<string, unknown>,
      TConfig extends PostConfig<T> = PostConfig<T>,
    >(url: T, data?: HttpPostData<TData>, config?: TConfig) {
      const requestConfig = (config ?? {}) as TConfig
      const isForm = isFormData(data)
      const resolved = resolveUrlParams(url, requestConfig.params)
      const requestUrl = `${joinUrl(options.baseURL, resolved.url)}${toQueryString(resolved.params, arrayMode)}`
      const response = await clientFetch(requestUrl, {
        body: isForm || data === undefined ? data : JSON.stringify(data),
        credentials: 'include',
        headers: resolveHeaders(
          options.headers,
          data !== undefined && !isForm ? { 'Content-Type': 'application/json' } : undefined,
        ),
        method: 'POST',
        signal: createSignal(requestConfig.signal, timeout),
      })

      let parsedResult: Awaited<ReturnType<typeof response.json>> = {}
      try {
        parsedResult = await response.json()
      } catch {
        parsedResult = {}
      }

      const parsedResponse: HttpResponse<HttpResponseData<T>, T, TConfig> = {
        config: createResponseConfig<T, TConfig>(joinUrl(options.baseURL, resolved.url), {
          ...requestConfig,
          params: resolved.params,
        }),
        data: parsedResult,
        status: response.status,
      }

      await options.onResponse?.(parsedResponse as HttpAnyResponse)
      return parsedResponse
    },
  }
}

function createAnySignal(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal?.any === 'function') {
    return AbortSignal.any(signals)
  }

  const controller = new AbortController()

  signals.filter(Boolean).forEach((signal) => {
    signal.addEventListener('abort', () => controller.abort(), { once: true })
  })

  return controller.signal
}

function createResponseConfig<TKey extends HttpKey, TConfig extends HttpConfigFull<TKey>>(
  url: string,
  config: TConfig,
): HttpResponseConfig<TKey, TConfig> {
  const responseConfig = { ...config } as Record<string, unknown>
  delete responseConfig.signal

  return {
    ...responseConfig,
    url,
  } as HttpResponseConfig<TKey, TConfig>
}

function createSignal(signal: AbortSignal | AbortSignal[] | undefined, timeout: number): AbortSignal {
  const timeoutSignal = createTimeoutSignal(timeout)

  if (Array.isArray(signal)) {
    return createAnySignal([...signal, timeoutSignal])
  }

  if (signal) {
    return createAnySignal([signal, timeoutSignal])
  }

  return timeoutSignal
}

function createTimeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal?.timeout === 'function') {
    return AbortSignal.timeout(ms)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), ms)

  controller.signal.addEventListener('abort', () => clearTimeout(timeoutId), {
    once: true,
  })

  return controller.signal
}

function getRetryDelay(attempt: number, delay: number): number {
  return delay * 2 ** attempt
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData
}

function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 429
}

function joinUrl(baseURL: string, url: string): string {
  const normalizedBase = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
  const normalizedUrl = url.startsWith('/') ? url.slice(1) : url

  return `${normalizedBase}/${normalizedUrl}`
}

function resolveHeaders(
  value: CreateHttpOptions['headers'],
  extraHeaders?: Record<string, string>,
): Record<string, string> {
  const headers = typeof value === 'function' ? value() : value

  return Object.entries({
    ...headers,
    ...extraHeaders,
  }).reduce<Record<string, string>>((acc, [key, headerValue]) => {
    if (typeof headerValue === 'string') {
      acc[key] = headerValue
    }

    return acc
  }, {})
}

function serializeQueryValue(
  urlParams: URLSearchParams,
  key: string,
  value: HttpParam[string],
  arrayMode: HttpArrayMode,
): void {
  if (value === undefined) {
    return
  }

  if (Array.isArray(value)) {
    if (arrayMode === 'json') {
      urlParams.append(key, JSON.stringify(value))
      return
    }

    value.forEach((item) => {
      urlParams.append(`${key}[]`, item)
    })
    return
  }

  urlParams.append(key, String(value))
}

function toQueryString(params?: HttpParam, arrayMode: HttpArrayMode = 'json'): string {
  const urlParams = new URLSearchParams()

  Object.entries(params ?? {}).forEach(([key, value]) => {
    serializeQueryValue(urlParams, key, value, arrayMode)
  })

  return urlParams.size > 0 ? `?${urlParams}` : ''
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
