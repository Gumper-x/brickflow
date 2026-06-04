# `@brickflow/http`

Nuxt HTTP module and typed client with:

- `NuxtApp.$http`
- `useHttp()` auto-import
- request/response middleware
- retry and timeout support
- optional client cache via IndexedDB
- typed URL literals for `get`, `post`, and `useHttp`

## Install

```bash
pnpm add @brickflow/http
```

## Nuxt Setup

```ts
export default defineNuxtConfig({
  modules: ['@brickflow/http'],
})
```

With options:

```ts
export default defineNuxtConfig({
  modules: ['@brickflow/http'],
  brickflowHttp: {
    baseURL: 'https://api.example.com',
    cache: true,
    cacheDbName: 'smart-cache-v2',
    cacheStoreName: 'data',
    cacheTtlMs: 1000 * 60 * 60 * 24 * 7,
    clientEnvHeader: true,
    defaultHeaders: {
      'X-App-Version': '1.0.0',
    },
    disableCacheInDev: true,
    requestTimeoutMs: 80000,
    retry: {
      delay: 300,
      retries: 3,
    },
  },
})
```

## Defaults

`brickflowHttp` defaults:

| Option              | Default            |
| ------------------- | ------------------ |
| `baseURL`           | `''`               |
| `cache`             | `true`             |
| `cacheDbName`       | `'smart-cache-v2'` |
| `cacheStoreName`    | `'data'`           |
| `cacheTtlMs`        | `604800000`        |
| `clientEnvHeader`   | `true`             |
| `defaultHeaders`    | `{}`               |
| `disableCacheInDev` | `true`             |
| `requestTimeoutMs`  | `80000`            |
| `retry.delay`       | `300`              |
| `retry.retries`     | `3`                |

Runtime behavior:

- `X-Requested-With: XMLHttpRequest` is added automatically
- in dev, `Client-Env: development` is added when `clientEnvHeader` is enabled
- `5xx` and `451` responses with `{ status: 'error' }` trigger Nuxt `showError()`

## Basic Usage

Use `$http` in components, composables, or plugins:

```ts
const { $http } = useNuxtApp()

const response = await $http.get<{ id: string; name: string }>('/user', {
  params: {
    id: '42',
  },
})

if ('status' in response.data && response.data.status === 'error') {
  console.error(response.data.message)
} else {
  console.log(response.data.name)
}
```

POST:

```ts
const { $http } = useNuxtApp()

const response = await $http.post<{ ok: true }>(
  '/posts',
  {
    title: 'Hello',
  },
  {
    params: {
      draft: true,
    },
  },
)
```

## `useHttp()`

`useHttp()` is auto-imported and returns:

- `data`
- `error`
- `pending`
- `pendingCache`
- `hasFirstData`
- `hasFreshData`
- `fetch()`

Basic example:

```ts
const users = await useHttp<Array<{ id: string; name: string }>>({
  server: true,
  url: '/users',
})
```

With params:

```ts
const users = await useHttp<Array<{ id: string; name: string }>, { page: number }>({
  initParams: {
    page: 1,
  },
  url: '/users',
})

await users.fetch({
  page: 2,
})
```

With side effects:

```ts
const profile = await useHttp<{ id: string; name: string }>({
  effect(payload, { cached }) {
    if (!cached) {
      console.log('fresh profile payload', payload)
    }
  },
  url: '/profile',
})
```

## Typed Routes

If you want `'/users'` and other URL literals to infer `params`, `data`, `error`, and `body` automatically, extend the global `BrickflowHttpRouteMap`.

Create a declaration file, for example `types/brickflow-http.d.ts`:

```ts
import type { HttpErrorPayload } from '@brickflow/http'

declare global {
  interface BrickflowHttpRouteMap {
    '/api/user': {
      data: { id: string; name: string }
      error: HttpErrorPayload & { code?: 'NOT_FOUND' }
      params: { id: string }
    }
    '/api/posts': {
      data: Array<{ id: string; title: string }>
      params: { page?: number }
    }
    '/api/posts/create': {
      body: { title: string }
      data: { id: string }
    }
  }
}

export {}
```

After that, `$http` and `useHttp()` infer types from the URL literal automatically.

Typed `get`:

```ts
const { $http } = useNuxtApp()

const response = await $http.get('/api/user', {
  params: {
    id: '42',
  },
})
```

Typed `post`:

```ts
const { $http } = useNuxtApp()

await $http.post('/api/posts/create', {
  title: 'New post',
})
```

Typed `useHttp` without generics:

```ts
const posts = await useHttp({
  initParams: {
    page: 1,
  },
  url: '/api/posts',
})

await posts.fetch({
  page: 2,
})
```

## Strict Client

`$http` keeps a fallback overload for plain `string`, so unknown URLs are still allowed.

If you want to forbid unknown URLs completely:

```ts
import { createStrictHttpClient } from '@brickflow/http'

const { $http } = useNuxtApp()
const strictHttp = createStrictHttpClient($http)

await strictHttp.get('/api/user', {
  params: { id: '42' },
})

// TypeScript error
await strictHttp.get('/api/unknown')
```

If you want typed overloads on a standalone client while keeping the plain `string` fallback:

```ts
import { createHttpClient, createTypedHttpClient } from '@brickflow/http'

const http = createTypedHttpClient(
  createHttpClient({
    baseURL: 'https://api.example.com',
  }),
)
```

## Dynamic Base URL

Standalone client supports a dynamic resolver:

```ts
const tenantStore = useTenantStore()

const http = createHttpClient({
  baseURL: () => tenantStore.apiBaseUrl,
})
```

In Nuxt, the better option is request middleware, because it works for both `$http` and `useHttp()`:

```ts
import { addHttpRequestMiddleware } from '@brickflow/http'

export default defineNuxtPlugin(() => {
  const apiBaseUrl = useState('api-base-url', () => 'https://dummyjson.com')

  addHttpRequestMiddleware((request) => {
    if (request.url.startsWith('/products') || request.url.startsWith('/test')) {
      request.baseURL = apiBaseUrl.value
    }
  })
})
```

Then the same request code can stay relative:

```ts
const products = await useHttp({
  url: '/products',
})

const { $http } = useNuxtApp()
await $http.get('/test')
```

The playground app contains a live example that switches the same typed requests between:

- direct `https://dummyjson.com`
- local proxy `/api/dummyjson`

See:

- [apps/playground/app/pages/index.vue](/Users/andrii/Lab/personal/brickme/apps/playground/app/pages/index.vue:1)
- [apps/playground/app/plugins/http-middleware.ts](/Users/andrii/Lab/personal/brickme/apps/playground/app/plugins/http-middleware.ts:1)

## Global Middleware

Register middleware once and it will run for every request or response:

```ts
import { addHttpRequestMiddleware, addHttpResponseMiddleware } from '@brickflow/http'

export default defineNuxtPlugin(() => {
  addHttpRequestMiddleware((request) => {
    request.headers.set('X-App-Version', '1.0.0')
  })

  addHttpResponseMiddleware((response, request) => {
    if (response.status >= 500) {
      console.error('HTTP error', request.url, response.status)
    }
  })
})
```

Request middleware can mutate:

- `baseURL`
- `url`
- `method`
- `headers`
- `body`
- `params`
- `signal`
- `credentials`

Response middleware receives:

- `response`
- `request`

You can remove middleware later:

```ts
import { addHttpRequestMiddleware, removeHttpRequestMiddleware } from '@brickflow/http'

const middleware = (request: Parameters<typeof addHttpRequestMiddleware>[0]) => {
  request.headers.set('X-Debug', '1')
}

addHttpRequestMiddleware(middleware)
removeHttpRequestMiddleware(middleware)
```

## Standalone Client

You can use the client outside Nuxt injection:

```ts
import { createHttpClient } from '@brickflow/http'

const http = createHttpClient({
  baseURL: 'https://api.example.com',
  requestTimeoutMs: 10000,
  retry: {
    delay: 250,
    retries: 2,
  },
})

const response = await http.get<{ ok: true }>('/health')
```

With custom headers:

```ts
const http = createHttpClient({
  baseURL: async () => `https://${tenant.value}.api.example.com`,
  createHeaders: async () => {
    return {
      Authorization: `Bearer ${token}`,
    }
  },
})
```

## Exports

Main exports:

- default Nuxt module
- `createHttpClient`
- `createTypedHttpClient`
- `createStrictHttpClient`
- `defineHttpRoutes`
- `addHttpRequestMiddleware`
- `addHttpResponseMiddleware`
- `removeHttpRequestMiddleware`
- `removeHttpResponseMiddleware`
- public TypeScript types for client, config, middleware, payloads, and typed route maps
