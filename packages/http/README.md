# @brickflow/http

Минимальный HTTP-пакет для brickflow:

- `createHttp` для низкоуровневых `GET`/`POST`
- `createUseHttp` для Nuxt state-обёртки с cache, SSR и ручным `fetch`
- `defineGet` для типизированных endpoint-фабрик
- `createUseCase` для DI-паттерна в доменных модулях

Актуальные примеры в репозитории лежат в `apps/playground`.

## Exports

Рекомендуемый импорт:

```ts
import { createHttp, createUseHttp, createUseCase, defineGet } from '@brickflow/http'
```

Из пакета также экспортируются:

- `createURL`
- `hashData`
- типы `HttpClient`, `HttpConfig`, `HttpEndpoint`, `HttpKey`, `HttpParam`, `HttpResponse`, `HttpResponseData`
- Nuxt-типы `UseHttpFn`, `UseHttpOptions`, `UseHttpResult`

Сабпуть `@brickflow/http/nuxt` остаётся доступным, но в текущей кодовой базе `playground` использует импорты из корня.

## Типизация API

Пакет не знает схему вашего API заранее. Её нужно объявить в проекте через `declare module '@brickflow/http'`.

Актуальный пример из `apps/playground/types/http.d.ts`:

```ts
import type { HttpKey, HttpResponseData } from '@brickflow/http'

type Convention = {
  '/api/http-error-demo': null
  '/products':
    | {
        limit: number
        products: {
          category: string
          id: number
          price: number
          rating: number
          thumbnail: string
          title: string
        }[]
        skip: number
        total: number
      }
    | {
        message: 'error'
      }
}

declare module '@brickflow/http' {
  interface HttpConfig<TKey extends HttpKey = HttpKey> {
    ignore?: (data: HttpResponseData<TKey>) => boolean
  }

  interface HttpEndpoint extends Convention {}
}

export {}
```

Что это даёт:

- `HttpKey` становится union из endpoint-ключей
- `httpClient.get('/products')` получает корректный тип ответа
- `createGet<Params>()('/products')` наследует тот же контракт
- `HttpConfig` можно расширять своими полями, как в playground через `ignore`

Если нужен типизированный `error` в `UseHttpResult`, дополнительно расширьте `HttpErrorMap`. По умолчанию `error` имеет тип `never`, а разделение между `data` и `error` зависит только от runtime `isError`.

## createHttp

Актуальный пример из `apps/playground/plugins/01.di.ts`:

```ts
import { createHttp } from '@brickflow/http'

import { handlePlaygroundResponse } from '~/core/http-error'

const httpClient = createHttp({
  baseURL: 'https://dummyjson.com',
  headers: {
    'X-Playground-Http': 'playground-runtime',
  },
  onResponse: handlePlaygroundResponse,
})
```

Поддерживаемые опции:

- `baseURL: string`
- `arrayMode?: 'json' | 'repeat'`
- `fetch?: typeof fetch`
- `headers?: Record<string, string | undefined> | (() => Record<string, string | undefined>)`
- `onResponse?: (response) => void | Promise<void>`
- `timeout?: number`

### GET

```ts
const response = await httpClient.get('/products', {
  params: {
    limit: 10,
  },
  retry: {
    delay: 300,
    retries: 3,
  },
})
```

Особенности:

- query строится из `params`
- `GET` поддерживает retry для `429` и `5xx`
- delay экспоненциальный: `delay * 2 ** attempt`
- `signal` можно передать как один `AbortSignal` или массив `AbortSignal[]`

### POST

```ts
const { data } = await httpClient.post('/api/http-error-demo')
```

Для `POST`:

- `Record<string, unknown>` сериализуется в JSON
- `FormData` отправляется как есть
- retry нет
- если response не JSON, пакет вернёт пустой объект в `data`

### Расширение `HttpConfig`

Так как `HttpConfig` расширяемый, можно прокидывать свои поля в запрос и читать их в `onResponse`.

Пример из playground:

```ts
httpClient.get('/products', {
  ignore: (data) => data?.limit === 20,
})
```

```ts
export function handlePlaygroundResponse(
  response: Parameters<NonNullable<CreateHttpOptions['onResponse']>>[0],
): void {
  console.log(response.config.ignore?.(response.data))
}
```

## createUseHttp

В `apps/playground/core/http.ts` app-level инстанс создаётся один раз:

```ts
import { createUseHttp, defineGet } from '@brickflow/http'

import { dbDeleteKeysWithPart, dbGet, dbSafeSet } from './indexdb'

const CACHE_DB_NAME = 'smart-cache-v2'
const CACHE_STORE_NAME = 'playground-http'

const useHttp = createUseHttp({
  getCache: () => ({
    deleteKeysWithPart: async (part: string) => await dbDeleteKeysWithPart(part, CACHE_DB_NAME, CACHE_STORE_NAME),
    get: async <T>(key: string) => await dbGet<T>(key, CACHE_DB_NAME, CACHE_STORE_NAME),
    set: async <T>(key: string, value: T, ttl: number) =>
      await dbSafeSet<T>(key, value, CACHE_DB_NAME, CACHE_STORE_NAME, ttl),
  }),
  getHttpClient: () => useNuxtApp().$http,
  isDev: () => false,
})

export const createGet = defineGet(useHttp)
```

Зависимости:

- `getHttpClient` обязательно
- `getCache` опционально
- `isDev` опционально
- `isError` опционально
- `ttl` опционально
- `channelName` опционально

`createUseHttp` возвращает функцию `useHttp(options)`, которая создаёт реактивное состояние запроса:

- `data`
- `error`
- `pending`
- `pendingCache`
- `hasFirstData`
- `hasFreshData`
- `fetch(params?, { signal? })`

### Опции useHttp

- `url`
- `initParams`
- `effect`
- `isError`
- `lazy`
- `server`

`effect(data, config)` вызывается и для cache, и для fresh-response:

`effect` должен быть синхронным: `async`-обработчики не поддерживаются и будут отклонены TypeScript.

- `config.cached === true` для cache
- `config.cached === false` для сети
- `config.params` содержит уже применённые params

## defineGet

`defineGet` связывает app-level `useHttp` с endpoint-фабриками:

```ts
const useHttp = createUseHttp({ ... })

export const createGet = defineGet(useHttp)
```

Дальше в домене можно описывать запросы коротко и типизированно:

```ts
products: createGet<{
  limit: number
}>()('/products')
```

Path-параметры можно передавать тем же объектом `params`:

```ts
productOne: createGet<{
  productId: number
}>()('/products/:productId')
```

При вызове `productId` будет подставлен в URL, а не уйдёт в query string:

```ts
const productHttp = await app.$di.product.productOne({
  lazy: true,
})

await productHttp.fetch({
  productId: 3,
})
```

Если generic не передан, `:segment` автоматически типизируется как `string`:

```ts
productOne: createGet()('/products/:productId')
```

Если generic передан, path params мерджатся с ним:

```ts
productOne: createGet<{
  test: number
}>()('/products/:productId')
```

В этом случае тип params будет таким:

```ts
{
  productId: string
  test: number
}
```

Path params нужно передавать явно:

```ts
const productHttp = await app.$di.product.productOne({
  lazy: true,
})

await productHttp.fetch({
  productId: '3',
})
```

Если нужно явно переопределить тип ответа для конкретного endpoint-а, можно добавить ещё один generic-слой:

```ts
products: createGet<{
  limit: number
}>()<{
  test: string
}>('/products')
```

`defineGet` поддерживает два слоя настроек:

1. Базовые настройки endpoint-а при объявлении:

```ts
const products = createGet<{ limit: number }>()('/products')
```

2. Runtime-опции при вызове:

```ts
const productsHttp = await products({
  initParams: { limit: 20 },
  lazy: true,
  server: false,
})
```

Если `effect` или `isError` указаны и при объявлении, и при вызове, пакет объединяет их так:

- `effect` вызывает оба обработчика
- `isError` из runtime имеет приоритет

## createUseCase

В playground доменный модуль собирается через `createUseCase`:

```ts
import { createUseCase } from '@brickflow/http'

import { createGet } from '~/core/http'

export default createUseCase()(({ httpClient }) => {
  return {
    async apiError() {
      const { data } = await httpClient.post('/api/http-error-demo')
      return data
    },

    products: createGet<{
      limit: number
    }>()('/products'),
  }
})
```

Это даёт простой контракт для DI: use-case получает `httpClient`, а внутри может смешивать:

- прямые mutation/one-shot запросы через `httpClient`
- stateful GET-запросы через `createGet`

## Использование в компоненте

Актуальный пример из `apps/playground/pages/index.vue`:

```vue
<script lang="ts" setup>
  const app = useNuxtApp()
  const httpProducts = await app.$di.product.products({
    lazy: true,
  })
</script>

<template>
  <button
    type="button"
    @click="httpProducts.fetch()"
  >
    {{ httpProducts.hasFirstData }} Action
  </button>

  {{ httpProducts.data }}
</template>
```

Типичный сценарий:

1. Создать request-state через `await endpoint({ ...options })`
2. Если `lazy: true`, вызвать `fetch()` вручную
3. Читать `data`, `error`, `pending`, `pendingCache`

Пример с параметрами:

```ts
const productsHttp = await app.$di.product.products({
  initParams: {
    limit: 10,
  },
  lazy: true,
})

await productsHttp.fetch({
  limit: 30,
})
```

## Cache и синхронизация между вкладками

Если передан `getCache`, `createUseHttp`:

- сначала пробует отдать cache
- вызывает `effect(..., { cached: true })` для cache-ответа
- затем делает сетевой запрос
- сохраняет успешный ответ в cache
- при изменении хеша удаляет связанные cache-ключи через `deleteKeysWithPart`

Дополнительно пакет использует `BroadcastChannel` и синхронизирует свежие успешные GET-ответы между вкладками.

По умолчанию:

- `ttl = 7 дней`
- `channelName = 'http-tab-sync'`

## SSR

Если вызвать endpoint с `server: true`, на сервере пакет использует `useLazyAsyncData`, сохраняет результат в `useState` и переиспользует его на клиенте после гидрации.

Это полезно для страниц, где нужен первый ответ уже в SSR, но тот же контракт `data / pending / fetch` должен остаться и на клиенте.

## Вспомогательные функции

```ts
import { createURL, hashData } from '@brickflow/http'
```

- `createURL(url, params)` строит query string
- `hashData(data)` считает SHA-1 через `crypto.subtle`, а без него использует fallback-хеш

## Когда что использовать

`createHttp`:

- POST/мутации
- one-shot запросы
- когда не нужен reactive state

`createUseHttp` + `defineGet`:

- SSR-friendly GET
- cache и `pendingCache`
- повторное использование endpoint-описаний
- ручной `fetch()`

`createUseCase`:

- доменные модули с DI
- единый контракт для доступа к `httpClient`
