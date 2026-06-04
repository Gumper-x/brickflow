export interface CreateHttpClientOptions {
  baseURL?: HttpBaseURL
  createHeaders?: () => HeadersInit | Promise<HeadersInit>
  requestMiddleware?: HttpRequestMiddleware[]
  requestTimeoutMs?: number
  responseMiddleware?: HttpResponseMiddleware[]
  retry?: HttpRetryConfig
}
export interface GetConfig<
  TParams extends HttpParam = HttpParam,
  _TError extends HttpErrorPayload = HttpErrorPayload,
> extends HttpConfig<TParams> {
  retry?: HttpRetryConfig
}

export type HttpBaseURL = HttpBaseURLResolver | string

export type HttpBaseURLResolver = () => Promise<string> | string

export interface HttpClient {
  get: <
    TData = unknown,
    TParams extends HttpParam = HttpParam,
    TError extends HttpErrorPayload = HttpErrorPayload,
  >(
    url: string,
    config?: GetConfig<TParams, TError>,
  ) => Promise<HttpResponse<HttpPayload<TData, TError>>>
  post: <
    TData = unknown,
    TParams extends HttpParam = HttpParam,
    TError extends HttpErrorPayload = HttpErrorPayload,
  >(
    url: string,
    data?: FormData | Record<string, unknown>,
    config?: PostConfig<TParams, TError>,
  ) => Promise<HttpResponse<HttpPayload<TData, TError>>>
}

export interface HttpConfig<TParams extends HttpParam = HttpParam> {
  params?: TParams
  signal?: AbortSignal | AbortSignal[]
}

export interface HttpErrorPayload {
  [key: string]: unknown
  kind?: string
  message?: string
  status: 'error'
}

export type HttpParam = Record<string, HttpParamValue>

export type HttpParamValue = HttpPrimitive | null | ReadonlyArray<HttpPrimitive> | undefined

export type HttpPayload<TData, TError extends HttpErrorPayload = HttpErrorPayload> = TData | TError

export type HttpPrimitive = boolean | number | string

export interface HttpRequestContext<
  TParams extends HttpParam = HttpParam,
  TBody = FormData | Record<string, unknown> | undefined,
> {
  baseURL: string
  body?: TBody
  credentials: RequestCredentials
  headers: Headers
  method: 'GET' | 'POST'
  params?: TParams
  signal: AbortSignal
  url: string
}

export type HttpRequestMiddleware = (request: HttpRequestContext) => Promise<void> | void

export interface HttpResponse<TData = unknown> {
  config: {
    url: string
  }
  data: TData
  status: number
}

export type HttpResponseMiddleware = (response: HttpResponse, request: HttpRequestContext) => Promise<void> | void

export interface HttpRetryConfig {
  /**
   * Delay between retry attempts in milliseconds.
   *
   * @default 300
   */
  delay?: number
  /**
   * Number of retry attempts for GET requests.
   *
   * @default 3
   */
  retries?: number
}

export interface HttpRuntimeConfig {
  baseURL: string
  cache: boolean
  cacheDbName: 'smart-cache-v2'
  cacheStoreName: string
  cacheTtlMs: number
  clientEnvHeader: boolean
  defaultHeaders: Record<string, string>
  disableCacheInDev: boolean
  requestTimeoutMs: number
  retry: Required<HttpRetryConfig>
}

export interface PostConfig<
  TParams extends HttpParam = HttpParam,
  _TError extends HttpErrorPayload = HttpErrorPayload,
> extends HttpConfig<TParams> {}

export function createHttpUrl(url: string, params: HttpParam = {}): string {
  const query = serializeParams(params)
  if (!query) {
    return url
  }

  return `${url}?${query}`
}

export function createNetworkError(error: unknown): HttpErrorPayload {
  return {
    kind: 'network_error',
    message: error instanceof Error ? error.message : 'Network request failed',
    status: 'error',
  }
}

export function isHttpErrorPayload(value: unknown): value is HttpErrorPayload {
  return Boolean(value && typeof value === 'object' && 'status' in value && value.status === 'error')
}

export function joinUrl(baseURL: string, url: string): string {
  if (isAbsoluteUrl(url)) {
    return url
  }

  if (!baseURL) {
    return url
  }

  const left = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
  const right = url.startsWith('/') ? url.slice(1) : url

  return `${left}/${right}`
}

function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//.test(url) || url.startsWith('//')
}

function serializeParams(params: HttpParam = {}): string {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    const serializedValue = serializeParamValue(value)

    if (serializedValue !== null) {
      query.append(key, serializedValue)
    }
  })

  return query.toString()
}

function serializeParamValue(value: HttpParamValue): null | string {
  if (value === null || value === undefined) {
    return null
  }

  if (Array.isArray(value)) {
    return JSON.stringify(value)
  }

  return String(value)
}
