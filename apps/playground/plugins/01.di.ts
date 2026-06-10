import { createHttp } from '@brickflow/http'

import { handlePlaygroundResponse } from '~/core/http-error'

import { createPlaygroundDi } from '../domains'

export default defineNuxtPlugin(() => {
  const httpClient = createHttp({
    baseURL: 'https://dummyjson.com',
    headers: {
      'X-Playground-Http': 'playground-runtime',
    },
    onResponse: handlePlaygroundResponse,
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
