import { expect, it } from 'vitest'

import { createHttp, onResponseRetry } from '../../../packages/http/src/http'

it('waits for handlers and restarts the chain on retry for POST', async () => {
  const events: string[] = []
  let calls = 0
  const http = createHttp({
    baseURL: 'https://example.test',
    fetch: (_url, init) => {
      events.push(`fetch:${init?.method}`)
      calls += 1
      return Promise.resolve(new Response(JSON.stringify({ ok: calls > 1 }), { status: calls > 1 ? 200 : 429 }))
    },
    onResponse: [
      onResponseRetry({ attempts: 1, code: [429], delay: 1 }),
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 1))
        events.push('async')
      },
      () => {
        events.push('final')
      },
    ],
  })

  const response = await http.post('/api/http-error-demo', { id: 1 })
  expect(response.status).toBe(200)
  expect(response.meta.url).toBe('https://example.test/api/http-error-demo')
  expect(events).toEqual(['fetch:POST', 'fetch:POST', 'async', 'final'])
})

it('stops retrying a request after 100 retries', async () => {
  let calls = 0
  let finalHandlerCalls = 0
  const http = createHttp({
    baseURL: 'https://example.test',
    fetch: () => {
      calls += 1
      return Promise.resolve(new Response('{}', { status: 429 }))
    },
    onResponse: [
      () => ({ action: 'retry' }),
      () => {
        finalHandlerCalls += 1
      },
    ],
  })

  await http.get('/products')
  expect(calls).toBe(101)
  expect(finalHandlerCalls).toBe(1)
})
