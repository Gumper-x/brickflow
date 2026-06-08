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

interface PlaygroundHttpError {
  kind: 'playground_demo'
  message: string
  status: 'error'
}

declare module '@brickflow/http' {
  interface HttpTypeConfig {
    endpoints: {
      '/api/http-error-demo': PlaygroundHttpError
      '/products': DummyProductListResponse
      '/test': DummyTestResponse
    }
    error: PlaygroundHttpError
  }
}

export {}
