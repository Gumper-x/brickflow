# @brickflow/http

Минимальный HTTP-клиент с Nuxt-обёрткой `createUseHttp` и фабрикой `defineGet`.

```ts
import { createHttp, createUseHttp, defineGet, defineOnResponse, onResponseRetry } from '@brickflow/http'
```

## HTTP-клиент

```ts
const http = createHttp({
  baseURL: '/api',
  onResponse: [
    onResponseRetry({ attempts: 3, delay: 300, code: [429, 500] }),
    async (response, context) => {
      if (response.data?.code === 'token_expire' && context.attempt < 4) {
        await refreshOnce()
        return { action: 'retry' }
      }
    },
    (response) => handleError(response),
  ],
})

await http.get('/products', { params: { limit: 10 } })
await http.post('/orders', { productId: 1 })
```

`defineOnResponse(({ response, context }) => { ... })` выводит типы аргументов без ручной аннотации и возвращает обработчик для массива. `onResponse` принимает одну функцию или массив. Обработчики выполняются по порядку, включая асинхронные. `get`/`post` возвращают ответ только после завершения всей цепочки. `return { action: 'retry' }` прекращает текущую цепочку и повторяет исходный запрос; новый ответ снова проходит обработчики с первого. `context.attempt` начинается с нуля и увеличивается при каждом повторе. Каждый обработчик может задать собственный лимит. Общий предел — 100 повторов одного запроса: после него команда `retry` игнорируется, а следующие обработчики продолжают выполняться.

`onResponseRetry` — обычный обработчик. `attempts` задаёт число дополнительных попыток, `code` — HTTP-статусы, `delay` — базовую задержку в миллисекундах. Задержка растёт как `delay * 2 ** context.attempt`. Сетевые исключения этот обработчик не перехватывает. Повтор работает для GET и POST; для POST его следует включать только там, где повтор безопасен.

## HttpMeta

`HttpMeta` расширяется в приложении и передаётся вторым аргументом GET или третьим аргументом POST. В ответе метаданные доступны через `response.meta`; `signal` из них удаляется, а `url` добавляется.

```ts
declare module '@brickflow/http' {
  interface HttpMeta<TKey extends HttpKey = HttpKey> {
    ignore?: (data: HttpResponseData<TKey>) => boolean
  }
}

await http.get('/products', { ignore: (data) => data?.limit === 20 })
```

`ignore` здесь лишь пример пользовательского поля: библиотека сама его не обрабатывает.

## Nuxt

`createUseHttp` передаёт `meta` в HTTP-клиент. `defineGet` объединяет `meta` из объявления endpoint и из вызова; поля вызова имеют приоритет.

```ts
const useHttp = createUseHttp({ getHttpClient: () => useNuxtApp().$http, getCache: () => null })
const createGet = defineGet(useHttp)
const products = createGet<{ limit: number }>()('/products', {
  meta: { ignore: () => false },
})
await products({ meta: { ignore: () => true } })
```

`params` и `signal` управляются `createUseHttp` отдельно. Остальные возможности `createUseHttp` — кэш, SSR, реактивные `data`/`error`/`pending` и ручной `fetch` — сохраняются.
