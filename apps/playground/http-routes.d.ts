import type { HttpErrorPayload } from '@brickflow/http'

interface DummyProductListResponse {
  limit: number
  products: DummyProductPreview[]
  skip: number
  total: number
}

interface DummyProductPreview {
  category: string
  id: number
  price: number
  rating: number
  thumbnail: string
  title: string
}

interface DummyTestResponse {
  method: 'GET'
  status: 'ok'
}

declare global {
  interface BrickflowHttpRouteMap {
    '/api/http-error-demo': {
      error: HttpErrorPayload & {
        kind: 'playground_demo'
      }
    }
    '/products': {
      data: DummyProductListResponse
      params: {
        limit: number
        select?: string
        skip: number
      }
    }
    '/test': {
      data: DummyTestResponse
    }
  }
}

export {}
