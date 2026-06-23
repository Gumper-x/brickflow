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
  '/products/:productId': {
    category: 'beauty'
    description: 'The Powder Canister is a finely milled setting powder designed to set makeup and control shine. With a lightweight and translucent formula, it provides a smooth and matte finish.'
    id: 3
    title: 'Powder Canister'
  }
}

declare module '@brickflow/http' {
  interface HttpConfig<TKey extends HttpKey = HttpKey> {
    ignore?: (data: HttpResponseData<TKey>) => boolean
  }

  interface HttpEndpoint extends Convention {}
}

export {}
