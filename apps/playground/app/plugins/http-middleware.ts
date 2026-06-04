import { addHttpRequestMiddleware, addHttpResponseMiddleware } from '../../../../packages/http/src/module'

export default defineNuxtPlugin(() => {
  const apiBaseUrl = useState('playground-http-base-url', () => 'https://dummyjson.com')

  addHttpRequestMiddleware((request) => {
    request.headers.set('X-Playground-Http', 'enabled')

    if (request.url.startsWith('/products') || request.url.startsWith('/test')) {
      request.baseURL = apiBaseUrl.value
    }
  })

  addHttpResponseMiddleware((response, request) => {
    if (import.meta.dev && (request.url.includes('dummyjson.com') || request.url.includes('/api/dummyjson/'))) {
      console.info('[playground-http]', request.method, response.status, request.url)
    }
  })
})
