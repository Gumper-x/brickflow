import { getRetryDelay, isFormData, sleep } from '../utils/helpers'
import { getHttpRequestMiddlewares, getHttpResponseMiddlewares } from '../utils/middleware'
import {
  type CreateHttpClientOptions,
  type GetConfig,
  type HttpBaseURL,
  type HttpClient,
  type HttpErrorPayload,
  type HttpParam,
  type HttpPayload,
  type HttpRequestContext,
  type HttpResponse,
  type HttpRetryConfig,
  joinUrl,
  type PostConfig,
} from '../utils/shared'

export function createHttpClient(options: CreateHttpClientOptions = {}): HttpClient {
  const requestTimeoutMs = options.requestTimeoutMs ?? 80000
  const defaultRetry: Required<HttpRetryConfig> = {
    delay: options.retry?.delay ?? 300,
    retries: options.retry?.retries ?? 3,
  }

  return {
    async get<
      TData = unknown,
      TParams extends HttpParam = HttpParam,
      TError extends HttpErrorPayload = HttpErrorPayload,
    >(url: string, config: GetConfig<TParams, TError> = {}) {
      const retry = {
        delay: config.retry?.delay ?? defaultRetry.delay,
        retries: config.retry?.retries ?? defaultRetry.retries,
      }

      const attemptRequest = async (attempt: number): Promise<HttpResponse<HttpPayload<TData, TError>>> => {
        const request = await createRequestContext({
          method: 'GET',
          options,
          params: config.params,
          requestTimeoutMs,
          signal: config.signal,
          url,
        })

        try {
          const result = await fetch(request.url, {
            credentials: request.credentials,
            headers: request.headers,
            method: request.method,
            signal: request.signal,
          })

          const response = buildResponse<HttpPayload<TData, TError>>(
            request.url,
            (await readResponseBody(result)) as HttpPayload<TData, TError>,
            result.status,
          )

          if (!result.ok && isRetryableStatus(result.status) && attempt < retry.retries) {
            await sleep(getRetryDelay(attempt, retry.delay))
            return await attemptRequest(attempt + 1)
          }

          await runResponseMiddlewares(response, request, options.responseMiddleware)
          return response
        } catch (error) {
          if (isAbortError(error) || attempt >= retry.retries) {
            throw error
          }

          await sleep(getRetryDelay(attempt, retry.delay))
          return await attemptRequest(attempt + 1)
        }
      }

      return await attemptRequest(0)
    },
    async post<
      TData = unknown,
      TParams extends HttpParam = HttpParam,
      TError extends HttpErrorPayload = HttpErrorPayload,
    >(url: string, data?: FormData | Record<string, unknown>, config: PostConfig<TParams, TError> = {}) {
      const request = await createRequestContext({
        body: data,
        method: 'POST',
        options,
        params: config.params,
        requestTimeoutMs,
        signal: config.signal,
        url,
      })
      let requestBody: BodyInit | undefined

      if (request.body !== undefined) {
        requestBody = isFormData(request.body) ? request.body : JSON.stringify(request.body)
      }

      const result = await fetch(request.url, {
        body: requestBody,
        credentials: request.credentials,
        headers: request.headers,
        method: request.method,
        signal: request.signal,
      })

      const response = buildResponse<HttpPayload<TData, TError>>(
        request.url,
        (await readResponseBody(result)) as HttpPayload<TData, TError>,
        result.status,
      )

      await runResponseMiddlewares(response, request, options.responseMiddleware)
      return response
    },
  }
}

function buildRequestUrl<TParams extends HttpParam = HttpParam>(
  url: string,
  params: TParams | undefined,
  method: 'GET' | 'POST',
): string {
  if (!params || Object.keys(params).length === 0) {
    return url
  }

  const searchParams = new URLSearchParams()

  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return
    }

    if (Array.isArray(value)) {
      if (method === 'POST') {
        value.forEach((item) => {
          searchParams.append(`${key}[]`, String(item))
        })
        return
      }

      searchParams.append(key, JSON.stringify(value))
      return
    }

    searchParams.append(key, String(value))
  })

  const query = searchParams.toString()

  if (!query) {
    return url
  }

  const separator = url.includes('?') ? '&' : '?'

  return `${url}${separator}${query}`
}

function buildResponse<TData>(url: string, data: TData, status: number): HttpResponse<TData> {
  return {
    config: {
      url,
    },
    data,
    status,
  }
}

function createAnySignal(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any(signals)
  }

  const controller = new AbortController()

  signals.filter(Boolean).forEach((signal) => {
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  })

  return controller.signal
}

async function createRequestContext<TParams extends HttpParam = HttpParam>(input: {
  body?: FormData | Record<string, unknown>
  method: 'GET' | 'POST'
  options: CreateHttpClientOptions
  params?: TParams
  requestTimeoutMs: number
  signal?: AbortSignal | AbortSignal[]
  url: string
}): Promise<HttpRequestContext<TParams>> {
  const signal = resolveSignal(input.signal, input.requestTimeoutMs)
  const headers = await createRequestHeaders(
    input.options.createHeaders,
    input.method === 'POST' && input.body !== undefined && !isFormData(input.body)
      ? {
          'Content-Type': 'application/json',
        }
      : undefined,
  )
  const request: HttpRequestContext<TParams> = {
    baseURL: await resolveBaseURL(input.options.baseURL),
    body: input.body,
    credentials: 'include',
    headers,
    method: input.method,
    params: input.params,
    signal,
    url: input.url,
  }

  await runRequestMiddlewares(request, input.options.requestMiddleware)
  request.url = buildRequestUrl(joinUrl(request.baseURL, request.url), request.params, request.method)

  return request
}

async function createRequestHeaders(
  createHeaders: CreateHttpClientOptions['createHeaders'],
  extraHeaders?: HeadersInit,
): Promise<Headers> {
  const headers = new Headers(createHeaders ? await createHeaders() : undefined)
  const extra = new Headers(extraHeaders)

  extra.forEach((value, key) => {
    headers.set(key, value)
  })

  return headers
}

function createTimeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms)
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(new DOMException('Timed out', 'AbortError')), ms)

  controller.signal.addEventListener('abort', () => clearTimeout(timeoutId), { once: true })

  return controller.signal
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 429
}

async function readResponseBody(response: Response): Promise<unknown> {
  const raw = await response.text()

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

async function resolveBaseURL(baseURL: HttpBaseURL | undefined): Promise<string> {
  if (!baseURL) {
    return ''
  }

  if (typeof baseURL === 'function') {
    return (await baseURL()) || ''
  }

  return baseURL
}

function resolveSignal(signal: AbortSignal | AbortSignal[] | undefined, requestTimeoutMs: number): AbortSignal {
  const timeoutSignal = createTimeoutSignal(requestTimeoutMs)

  if (Array.isArray(signal)) {
    return createAnySignal([...signal, timeoutSignal])
  }

  if (signal) {
    return createAnySignal([signal, timeoutSignal])
  }

  return timeoutSignal
}

async function runRequestMiddlewares(
  request: HttpRequestContext,
  middlewares: CreateHttpClientOptions['requestMiddleware'],
): Promise<void> {
  for (const middleware of [...getHttpRequestMiddlewares(), ...(middlewares ?? [])]) {
    await middleware(request)
  }
}

async function runResponseMiddlewares(
  response: HttpResponse,
  request: HttpRequestContext,
  middlewares: CreateHttpClientOptions['responseMiddleware'],
): Promise<void> {
  for (const middleware of [...getHttpResponseMiddlewares(), ...(middlewares ?? [])]) {
    await middleware(response, request)
  }
}
