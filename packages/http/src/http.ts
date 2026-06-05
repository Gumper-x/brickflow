export type ConventionError = HttpError

export interface CreateHttpOptions {
  baseURL: string
  fetch?: typeof fetch
  headers?: (() => Record<string, string | undefined>) | Record<string, string | undefined>
  onResponseError?: (response: HttpResponse<HttpError>) => Promise<void> | void
  requestInit?: Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'>
  timeout?: number
}

export interface GetConfig extends HttpConfig {
  retry?: {
    delay?: number
    retries?: number
  }
}

export interface HttpClient {
  get: <T extends HttpKey>(url: T, config?: GetConfig) => Promise<HttpResponse<HttpResponseData<T>>>
  post: <T extends HttpKey>(
    url: T,
    data?: FormData | Record<string, unknown>,
    config?: PostConfig,
  ) => Promise<HttpResponse<HttpResponseData<T>>>
}

export interface HttpDefaultError {
  [key: string]: unknown
  kind?: string
  message?: string
  status: 'error'
}
export interface HttpDefaultSuccess {
  [key: string]: unknown
  status?: 'success'
}
export type HttpError = HttpConfigValue<'error', HttpDefaultError>
export type HttpKey = Extract<keyof HttpSchema, string>
export type HttpParam = Record<string, boolean | number | string | string[] | undefined>
export type HttpMatchedError<TData = unknown, TError = HttpError> = Extract<TData, TError>
export type HttpMatchedSuccess<TData = unknown, TError = HttpError> = Exclude<TData, HttpMatchedError<TData, TError>>
export type HttpErrorData<TData = unknown> = HttpMatchedError<TData>
export type HttpSuccessResult<TData = unknown, TError = HttpErrorData<TData>> = HttpMatchedSuccess<TData, TError>
export type HttpErrorGuard<TData = unknown, TError extends TData = HttpMatchedError<TData>> = (
  payload: TData,
) => payload is TError
export interface HttpResponse<T = HttpResponseData> {
  config: {
    ignore?: ((response: HttpResponse<HttpError>) => boolean) | undefined
    url: string
  }
  data: T
  status: number
}

export type HttpResponseData<TKey extends HttpKey = HttpKey> = HttpSchema[TKey]

export type HttpSchema = HttpConfigValue<'endpoints', Record<string, HttpDefaultError | HttpDefaultSuccess>>

export type HttpSuccessData<TKey extends HttpKey = HttpKey> = Exclude<HttpResponseData<TKey>, HttpError>

export interface HttpTypeConfig {}

export interface PostConfig extends HttpConfig {}

interface HttpConfig {
  ignore?: (response: HttpResponse<HttpError>) => boolean
  params?: HttpParam
  signal?: AbortSignal | AbortSignal[]
}

type HttpConfigValue<TKey extends string, TFallback> = TKey extends keyof HttpTypeConfig
  ? HttpTypeConfig[TKey]
  : TFallback

type QueryArrayMode = 'json' | 'repeat'

export function createHttp(options: CreateHttpOptions): HttpClient {
  const clientFetch = options.fetch ?? fetch
  const timeout = options.timeout ?? 80000

  return {
    get<T extends HttpKey>(url: T, config: GetConfig = {}) {
      const requestUrl = `${joinUrl(options.baseURL, url)}${toQueryString(config.params, 'json')}`
      const { delay = 300, retries = 3 } = config.retry ?? {}

      const attemptRequest = async (attempt: number): Promise<HttpResponse<HttpResponseData<T>>> => {
        try {
          const result = await clientFetch(requestUrl, {
            ...options.requestInit,
            credentials: 'include',
            headers: resolveHeaders(options.headers),
            method: 'GET',
            signal: createSignal(config.signal, timeout),
          })

          const parsedResult = await result.json()
          const response = {
            config: {
              ignore: config.ignore,
              url: joinUrl(options.baseURL, url),
            },
            data: parsedResult,
            status: result.status,
          }

          if (!result.ok && isRetryableStatus(result.status) && attempt < retries) {
            await wait(getRetryDelay(attempt, delay))
            return attemptRequest(attempt + 1)
          }

          await options.onResponseError?.(response)
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
    async post<T extends HttpKey>(url: T, data?: FormData | Record<string, unknown>, config: PostConfig = {}) {
      const isForm = isFormData(data)
      const requestUrl = `${joinUrl(options.baseURL, url)}${toQueryString(config.params, 'repeat')}`
      const response = await clientFetch(requestUrl, {
        ...options.requestInit,
        body: isForm || data === undefined ? data : JSON.stringify(data),
        credentials: 'include',
        headers: resolveHeaders(
          options.headers,
          data !== undefined && !isForm ? { 'Content-Type': 'application/json' } : undefined,
        ),
        method: 'POST',
        signal: createSignal(config.signal, timeout),
      })

      let parsedResult: Awaited<ReturnType<typeof response.json>> = {}
      try {
        parsedResult = await response.json()
      } catch {
        parsedResult = {}
      }

      const parsedResponse = {
        config: {
          ignore: config.ignore,
          url: joinUrl(options.baseURL, url),
        },
        data: parsedResult,
        status: response.status,
      }

      await options.onResponseError?.(parsedResponse)
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

function isFormData(value: FormData | Record<string, unknown> | undefined): value is FormData {
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
  arrayMode: QueryArrayMode,
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

function toQueryString(params?: HttpParam, arrayMode: QueryArrayMode = 'json'): string {
  const urlParams = new URLSearchParams()

  Object.entries(params ?? {}).forEach(([key, value]) => {
    serializeQueryValue(urlParams, key, value, arrayMode)
  })

  return urlParams.size > 0 ? `?${urlParams}` : ''
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
