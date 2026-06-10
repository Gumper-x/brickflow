import type { HttpClient } from '@brickflow/http'

import useProduct from './product/use-case'

export interface PlaygroundDi {
  product: ReturnType<typeof useProduct>
}

export function createPlaygroundDi(payload: { httpClient: HttpClient }): PlaygroundDi {
  const { httpClient } = payload

  return {
    product: useProduct({ httpClient }),
  }
}
