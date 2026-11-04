import { resolveUrlParams } from './utils'

export interface CreateHttpOptions {
  arrayMode?: HttpArrayMode
  baseURL: string
  fetch?: typeof fetch
  headers?: (() => HttpHeaders) | HttpHeaders
  onResponse?: HttpResponseHandler | HttpResponseHandler[]
  timeout?: number
}

export type GetMeta<TKey extends HttpKey = HttpKey> = HttpMetaFull<TKey>
export type HttpAnyResponse = HttpResponse<HttpResponseData<HttpKey>, HttpKey, HttpMetaFull<HttpKey>>
export type HttpArrayMode = 'json' | 'repeat'
export type HttpClient = {
  get: <T extends HttpKey, TMeta extends GetMeta<T> = GetMeta<T>>(
    url: T,
    meta?: TMeta,
  ) => Promise<HttpResponse<HttpResponseData<T>, T, TMeta>>
  post: <
    T extends HttpKey,
    TData extends Record<string, unknown> = Record<string, unknown>,
    TMeta extends PostMeta<T> = PostMeta<T>,
  >(
    url: T,
    data?: HttpPostData<TData>,
    meta?: TMeta,
  ) => Promise<HttpResponse<HttpResponseData<T>, T, TMeta>>
}
export interface HttpEndpoint {}
export type HttpErrorGuard<TData = unknown, TError extends TData = TData> = (payload: TData) => payload is TError

export type HttpKey = Extract<keyof HttpSchema, string>
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface HttpMeta<TKey extends HttpKey = HttpKey> {}
export type HttpParam = Record<string, boolean | number | string | string[] | undefined>
export type HttpPostData<TData extends Record<string, unknown> = Record<string, unknown>> = FormData | TData
export interface HttpResponse<
  T = unknown,
  TKey extends HttpKey = HttpKey,
  TMeta extends HttpMetaFull<TKey> = HttpMetaFull<TKey>,
> {
  data: T
  meta: HttpResponseMeta<TKey, TMeta>
  status: number
}
export type HttpResponseAction = { action: 'retry' }

export interface HttpResponseContext {
  attempt: number
}
export type HttpResponseData<TKey extends HttpKey = HttpKey> = HttpSchema[TKey]
export type HttpResponseHandler = (
  response: HttpAnyResponse,
  context: HttpResponseContext,
) => HttpResponseAction | Promise<HttpResponseAction | void> | void
export type HttpResponseMeta<TKey extends HttpKey = HttpKey, TMeta extends HttpMeta<TKey> = HttpMeta<TKey>> = Omit<
  TMeta,
  'signal'
> & { url: string }
export type PostMeta<TKey extends HttpKey = HttpKey> = HttpMetaFull<TKey>
type HttpHeaders = Record<string, string | undefined>
type HttpMetaFull<TKey extends HttpKey = HttpKey> = HttpMeta<TKey> & {
  params?: HttpParam
  signal?: AbortSignal | AbortSignal[]
}
type HttpSchema = keyof HttpEndpoint extends never ? Record<string, unknown> : HttpEndpoint

const MAX_REQUEST_RETRIES = 100

export function createHttp(options: CreateHttpOptions): HttpClient {
  const arrayMode = options.arrayMode ?? 'json'
  const clientFetch = options.fetch ?? fetch
  const timeout = options.timeout ?? 80_000
  const handlers = options.onResponse ? [options.onResponse].flat() : []

  async function execute<T extends HttpKey, TMeta extends HttpMetaFull<T>>(
    url: T,
    meta: TMeta,
    method: 'GET' | 'POST',
    data?: HttpPostData,
  ): Promise<HttpResponse<HttpResponseData<T>, T, TMeta>> {
    const isForm = isFormData(data)
    const resolved = resolveUrlParams(url, meta.params)
    const baseUrl = joinUrl(options.baseURL, resolved.url)
    const requestUrl = `${baseUrl}${toQueryString(resolved.params, arrayMode)}`
    const responseMeta = createResponseMeta<T, TMeta>(baseUrl, { ...meta, params: resolved.params })

    for (let attempt = 0; ; attempt++) {
      const result = await clientFetch(requestUrl, {
        ...(method === 'POST' ? { body: isForm || data === undefined ? data : JSON.stringify(data) } : {}),
        credentials: 'include',
        headers: resolveHeaders(
          options.headers,
          method === 'POST' && data !== undefined && !isForm ? { 'Content-Type': 'application/json' } : undefined,
        ),
        method,
        signal: createSignal(meta.signal, timeout),
      })
      let parsedResult: unknown = {}
      try {
        parsedResult = await result.json()
      } catch {
        // Empty and non-JSON bodies have no data.
      }
      const response = {
        data: parsedResult as HttpResponseData<T>,
        meta: responseMeta,
        status: result.status,
      } as HttpResponse<HttpResponseData<T>, T, TMeta>
      const context: HttpResponseContext = {
        attempt,
      }
      let retry = false
      for (const handler of handlers) {
        const action = await handler(response as HttpAnyResponse, context)
        if (action?.action === 'retry' && attempt < MAX_REQUEST_RETRIES) {
          retry = true
          break
        }
      }
      if (!retry) {
        return response
      }
    }
  }

  return {
    get<T extends HttpKey, TMeta extends GetMeta<T> = GetMeta<T>>(url: T, meta?: TMeta) {
      return execute(url, (meta ?? {}) as TMeta, 'GET')
    },
    post<
      T extends HttpKey,
      TData extends Record<string, unknown> = Record<string, unknown>,
      TMeta extends PostMeta<T> = PostMeta<T>,
    >(url: T, data?: HttpPostData<TData>, meta?: TMeta) {
      return execute(url, (meta ?? {}) as TMeta, 'POST', data)
    },
  }
}

export function defineOnResponse(
  handler: (payload: {
    context: HttpResponseContext
    response: HttpAnyResponse
  }) => HttpResponseAction | Promise<HttpResponseAction | void> | void,
): HttpResponseHandler {
  return (response, context) => handler({ context, response })
}

export function onResponseRetry(options: {
  attempts: number
  code: number[]
  delay: number
}): HttpResponseHandler {
  return async (response, context) => {
    if (!options.code.includes(response.status) || context.attempt >= options.attempts) {
      return
    }
    await wait(options.delay * 2 ** context.attempt)
    return { action: 'retry' }
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

function createResponseMeta<TKey extends HttpKey, TMeta extends HttpMetaFull<TKey>>(
  url: string,
  meta: TMeta,
): HttpResponseMeta<TKey, TMeta> {
  const responseMeta = { ...meta } as Record<string, unknown>
  delete responseMeta.signal

  return {
    ...responseMeta,
    url,
  } as HttpResponseMeta<TKey, TMeta>
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

function isFormData(value: unknown): value is FormData {
  return typeof FormData !== 'undefined' && value instanceof FormData
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
