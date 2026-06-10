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
