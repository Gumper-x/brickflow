# @brickflow/http

Minimal HTTP package used in this repo for:

- low-level HTTP transport via `createHttp`
- Nuxt async state wrapper via `createUseHttp`
- reusable endpoint factory via `createGet`
- project-level typing through `declare module '@brickflow/http'`

This package does not know your API schema by default. The schema and error type are configured in the consumer project through `type.d.ts`.

## Exports

From `@brickflow/http`:

- `createHttp`
- `createURL`
- `hashData`
- HTTP types: `HttpClient`, `HttpError`, `HttpKey`, `HttpParam`, `HttpResponse`, `HttpResponseData`, `HttpSuccessData`

From `@brickflow/http/nuxt`:

- `createUseHttp`
- `createGet`
- Nuxt types: `UseHttpOptions`, `UseHttpResult`, `UseHttpFn`

## 1. Configure API types in `type.d.ts`

In this repo the typing is configured in `types/http.d.ts`.

```ts
import type { Convention, ConventionKeys } from 'convention'

type BrickHttpError = Exclude<Convention<ConventionKeys>, { status: 'success' }>
type BrickHttpSchema = {
  [TKey in ConventionKeys]: Convention<TKey>
}

declare module '@brickflow/http' {
  interface HttpTypeConfig {
    endpoints: BrickHttpSchema
    error: BrickHttpError
  }
}
```

What this gives:

- `HttpKey` becomes your endpoint union
- `HttpResponseData<'some/endpoint'>` becomes the response type for that endpoint
- `HttpSuccessData<'some/endpoint'>` becomes response without the configured error branch
- `UseHttpResult<T, P>['error']` is inferred from `HttpTypeConfig['error']`

This is the main place where project typing should live.

## 2. Create low-level HTTP client

Real usage from `plugins/01.di.ts`:

```ts
import { createHttp } from '@brickflow/http'

const httpClient = createHttp({
  baseURL: apiUrl,
  headers: () => ({
    'Client-Env': config.public.isDev ? 'development' : undefined,
    'Client-Lang': String(locale.value ?? 'en'),
    'Client-Socket-Id': socketClient?.io.id || '',
    'X-Requested-With': 'XMLHttpRequest',
  }),
  onResponseError: responseInterceptor,
})
```

Available options:

- `baseURL`
- `fetch`
- `headers`
- `onResponseError`
- `requestInit`
- `timeout`

`createHttp` returns:

```ts
interface HttpClient {
  get(url, config?)
  post(url, data?, config?)
}
```

## 3. Use `HttpClient` directly

Used in domain methods that do not need cached async state.

Example from `domains/content/use-case.ts`:

```ts
async create(title: string, type: string, description?: string) {
  const { data } = await httpClient.post('content/create', {
    description,
    title,
    type,
  })

  return data
}
```

Another example:

```ts
async updateType(itemId: string, type: string) {
  const { data } = await httpClient.post('content/update-type', {
    itemId,
    type,
  })

  return data
}
```

Use this style when:

- request is one-shot
- you do not need `pending`, `hasFirstData`, cache, SSR sync, or `fetch()`

## 4. Create Nuxt `useHttp`

In this repo the app-level `useHttp` is created once in `core/util.ts`:

```ts
import { createUseHttp } from '@brickflow/http/nuxt'

const useHttp = createUseHttp({
  getCache: () => ({
    deleteKeysWithPart: async (part) => await dbDeleteKeysWithPart(part, 'smart-cache-v2', STORE_NAME),
    get: async (key) => await dbGet(key, 'smart-cache-v2', STORE_NAME),
    set: async (key, value, ttl) => await dbSafeSet(key, value, 'smart-cache-v2', STORE_NAME, ttl),
  }),
  getHttpClient: () => useNuxtApp().$http,
  isDev: () => useRuntimeConfig().public.isDev,
})
```

Dependencies:

- `getHttpClient`
- `getCache`
- `isError`
- `isDev`
- `ttl`
- `channelName`

`isError` can be set globally here if your project needs a custom runtime error predicate.

## 5. Bind `createGet` once

The package exports `createGet(useHttp)`, which builds typed endpoint helpers on top of your local `useHttp`.

Real usage from `core/util.ts`:

```ts
import { createGet as createHttpGet, createUseHttp } from '@brickflow/http/nuxt'

const useHttp = createUseHttp({ ... })

export const createGet = createHttpGet(useHttp)
```

After that you can reuse `createGet` in domain files.

## 6. Create typed GET endpoints

### Without params

Example from `domains/storage/use-case.ts`:

```ts
plans: createGet()('storage/plans')
```

### With params

Example from `domains/feed/use-case.ts`:

```ts
home: createGet<{
  category?: 'fresh' | 'popular' | 'recommended' | 'updated'
  limit: number
  offset: number
}>()('feed/home')
```

### With `ignore`

Example from `domains/content/use-case.ts`:

```ts
analytics: createGet<{
  itemId: string
  period: '7d' | '28d' | '90d'
}>()('content/analytics', {
  ignore(res) {
    if (res.data.kind === 'no_auth') {
      return true
    }

    return false
  },
})
```

### With `effect`

Example from `domains/root/use-case.ts`:

```ts
main: createGet()('root/main', {
  effect(data, config) {
    if (data.status === 'error') {
      return
    }

    if (!config.cached) {
      userStore.setUser(data.user)
      userStore.setRegion(data.region)
    }
  },
})
```

### With `effect` and success handling

Example from `domains/storage/use-case.ts`:

```ts
current: createGet()('storage/current', {
  effect(data) {
    if (data.status === 'success') {
      storageStore.setCurrentPlan(data.plan)
    }
  },
})
```

## 7. Consume endpoint state in components

### Create request object

Example from `components/Search/index.vue`:

```ts
const searchFastHttp = await app.$di.search.fast({
  lazy: true,
  server: false,
})
```

### Trigger fetch manually

```ts
await searchFastHttp.fetch({
  text: searchQuery.value,
})
```

### Read `data`

```ts
const data = searchFastHttp.data

if (data?.status === 'success') {
  items.value = data.items
  users.value = data.users
}
```

### Read loading flags

Example from `components/ProfileMyGrid/index.vue`:

```vue
:loading="myContentHttp.pending || myContentHttp.pendingCache"
```

### Use `hasFirstData`

```vue
v-if="!myContentHttp.pending && myContentHttp.hasFirstData && items.length === 0"
```

## 8. `effect` semantics

`effect` receives the full response payload.

That means:

- it is called for success
- it is called for error
- you can branch on `data.status`
- `config.cached` tells whether the payload came from cache
- `config.params` contains mapped params used for the request

Example from `pages/profile/[username].vue`:

```ts
const profileHttp = await app.$di.profile.info({
  effect(data) {
    if (data.status === 'error' && data.kind === 'not_found') {
      showError(createError({
        fatal: true,
        statusCode: 404,
        statusMessage: 'Page Not Found',
      }))
    }
  },
  initParams: {
    username: String(profileParam.value),
  },
  server: true,
})
```

## 9. `data` and `error`

`UseHttpResult<T, P>` is split like this:

- `data`: success payload only
- `error`: configured project error payload only

Internally the split is done by runtime error predicate:

- global `isError` from `createUseHttp(...)`
- or per-request `isError`
- fallback: `payload.status === 'error'`

Important:

- runtime error predicate does not reconfigure TypeScript types
- TypeScript error type comes from `declare module '@brickflow/http'`

## 10. Supported request options

For `useHttp` / `createGet`:

- `url`
- `initParams`
- `mapParams`
- `effect`
- `ignore`
- `isError`
- `lazy`
- `server`

Example with `initParams`:

```ts
const myContentHttp = await app.$di.content.my({
  initParams: {
    limit: props.limit,
    offset: 0,
    order: selectedOrder.value,
    orderColumn: 'date',
    type: selectedType.value,
  },
})
```

Example with `fetch(...)` overriding params:

```ts
await myContentHttp.fetch({
  limit: props.limit,
  offset,
  order: selectedOrder.value,
  orderColumn: 'date',
  type: selectedType.value,
})
```

## 11. Cache behavior

When `getCache` is provided, `createUseHttp`:

- tries cached value first
- calls `effect(..., { cached: true })` for cached payload
- then performs fresh request
- stores success response in cache
- invalidates related keys when response hash changes

In this repo the cache is backed by IndexedDB in `core/util.ts`.

## 12. URL and hash helpers

The package also exports helpers used by the current implementation:

```ts
import { createURL, hashData } from '@brickflow/http'
```

`createURL(url, params)` builds query strings.

`hashData(data)` computes response hash for cache invalidation.

## 13. Recommended usage in this repo

Use `createHttp` when:

- you need direct `get/post`
- you are writing mutations or one-shot calls

Use `createUseHttp` + `createGet` when:

- you need SSR-aware async state
- you need `pending`, `pendingCache`, `hasFirstData`, `hasFreshData`
- you need cache integration
- you want reusable typed endpoint factories in domain modules

Use `type.d.ts` when:

- you want to define endpoint keys
- you want to define the project-wide error type
- you want all consumers to infer the same API schema
