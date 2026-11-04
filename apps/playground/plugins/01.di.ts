import { createHttp, onResponseRetry } from '@brickflow/http'

import { handlePlaygroundResponse } from '~/core/http-error'

import { createPlaygroundDi } from '../domains'

export default defineNuxtPlugin(() => {
  const httpClient = createHttp({
    baseURL: 'https://dummyjson.com',
    headers: {
      'X-Playground-Http': 'playground-runtime',
    },
    onResponse: [onResponseRetry({ attempts: 3, code: [429, 500], delay: 300 }), handlePlaygroundResponse],
  })

  // httpClient.get('/products', {
  //   ignore: (data) => data?.limit === 20,
  // })

  return {
    provide: {
      di: createPlaygroundDi({
        httpClient,
      }),
      http: httpClient,
    },
  }
})
