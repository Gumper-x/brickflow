import { createUseCase } from '@brickflow/http'

import { createGet } from '~/core/http'

export default createUseCase()(({ httpClient }) => {
  return {
    async apiError() {
      const { data } = await httpClient.post('/api/http-error-demo')
      return data
    },

    productOne: createGet()('/products/:productId'),
    productOne2: createGet<{ test: number }>()('/products/:productId'),
    productOne3: createGet()('/products/:sex'),
    products: createGet<{
      limit: number
    }>()('/products'),

    products2: createGet<{
      limit: number
    }>()('/products'),
  }
})
