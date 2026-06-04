import { addImportsDir, addPlugin, createResolver, defineNuxtModule } from '@nuxt/kit'

import type { HttpRetryConfig, HttpRuntimeConfig } from './runtime/utils/shared'

const DAY = 1000 * 60 * 60 * 24

export interface ModuleOptions {
  /**
   * Base URL used by the injected Nuxt HTTP client.
   *
   * @default ''
   */
  baseURL?: string
  /**
   * Enables client-side IndexedDB caching in `useHttp()`.
   *
   * @default true
   */
  cache?: boolean
  /**
   * IndexedDB database name used for cached responses.
   *
   * @default 'smart-cache-v2'
   */
  cacheDbName?: 'smart-cache-v2'
  /**
   * IndexedDB store name used for cached responses.
   *
   * @default 'data'
   */
  cacheStoreName?: string
  /**
   * Cache TTL in milliseconds.
   *
   * @default 604800000
   */
  cacheTtlMs?: number
  /**
   * Adds `Client-Env: development` in dev mode.
   *
   * @default true
   */
  clientEnvHeader?: boolean
  /**
   * Default headers merged into every request.
   *
   * @default {}
   */
  defaultHeaders?: Record<string, string>
  /**
   * Disables IndexedDB cache when `import.meta.dev` is enabled.
   *
   * @default true
   */
  disableCacheInDev?: boolean
  /**
   * Request timeout in milliseconds.
   *
   * @default 80000
   */
  requestTimeoutMs?: number
  /**
   * Retry policy for GET requests on retryable responses and network failures.
   *
   * @default { delay: 300, retries: 3 }
   */
  retry?: HttpRetryConfig
}

const defaultRuntimeConfig: HttpRuntimeConfig = {
  baseURL: '',
  cache: true,
  cacheDbName: 'smart-cache-v2',
  cacheStoreName: 'data',
  cacheTtlMs: DAY * 7,
  clientEnvHeader: true,
  defaultHeaders: {},
  disableCacheInDev: true,
  requestTimeoutMs: 80000,
  retry: {
    delay: 300,
    retries: 3,
  },
}

export default defineNuxtModule<ModuleOptions>({
  defaults: defaultRuntimeConfig,
  meta: {
    compatibility: {
      nuxt: '>=4.0.0',
    },
    configKey: 'brickflowHttp',
    name: '@brickflow/http',
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const currentConfig = (nuxt.options.runtimeConfig.public.brickflowHttp ?? {}) as Partial<HttpRuntimeConfig>

    nuxt.options.runtimeConfig.public.brickflowHttp = {
      ...defaultRuntimeConfig,
      ...currentConfig,
      ...options,
      defaultHeaders: {
        ...defaultRuntimeConfig.defaultHeaders,
        ...(currentConfig.defaultHeaders ?? {}),
        ...(options.defaultHeaders ?? {}),
      },
      retry: {
        ...defaultRuntimeConfig.retry,
        ...(currentConfig.retry ?? {}),
        ...(options.retry ?? {}),
      },
    }

    addPlugin(resolver.resolve('./runtime/plugin'))
    addImportsDir(resolver.resolve('./runtime/composables'))

    nuxt.hook('prepare:types', ({ references }) => {
      references.push({
        path: resolver.resolve('./runtime/types.d.ts'),
      })
    })
  },
})

export { createHttpClient } from './runtime/http/client'
export {
  addHttpRequestMiddleware,
  addHttpResponseMiddleware,
  removeHttpRequestMiddleware,
  removeHttpResponseMiddleware,
} from './runtime/utils/middleware'
export type {
  CreateHttpClientOptions,
  GetConfig,
  HttpBaseURL,
  HttpBaseURLResolver,
  HttpClient,
  HttpConfig,
  HttpErrorPayload,
  HttpParam,
  HttpPayload,
  HttpRequestContext,
  HttpRequestMiddleware,
  HttpResponse,
  HttpResponseMiddleware,
  HttpRetryConfig,
  HttpRuntimeConfig,
  PostConfig,
} from './runtime/utils/shared'
export { createStrictHttpClient, createTypedHttpClient, defineHttpRoutes } from './runtime/utils/typed'
export type {
  HttpRouteBody,
  HttpRouteData,
  HttpRouteDefinition,
  HttpRouteError,
  HttpRouteMap,
  HttpRouteParams,
  ResolveHttpRoute,
  StrictTypedHttpClient,
  TypedGetConfig,
  TypedHttpClient,
  TypedHttpResponse,
  TypedPostConfig,
} from './runtime/utils/typed'
