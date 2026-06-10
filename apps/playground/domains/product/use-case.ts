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
