import type { HttpClient, HttpResponseData } from '#brickflow-http/http'
import type { CreateGetOptions, CreateGetResult } from '#brickflow-http/nuxt'

import { createLocalGet } from '../../core/util'

export interface SystemUseCase {
  errorDemo: ErrorDemoRequest
  healthCheck: () => Promise<HttpResponseData<'/test'>>
}

type ErrorDemoRequest = (
  options?: CreateGetOptions<'/api/http-error-demo', Record<string, never>>,
) => Promise<CreateGetResult<'/api/http-error-demo', Record<string, never>>>

const errorDemo = createLocalGet<Record<string, never>>()('/api/http-error-demo')

export function createSystemUseCase(httpClient: HttpClient): SystemUseCase {
  return {
    errorDemo,
    async healthCheck() {
      const { data } = await httpClient.get('/test')

      return data
    },
  }
}
