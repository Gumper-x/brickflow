import type { HttpClient, HttpKey, HttpParam } from './http'
import type { UseHttpFn, UseHttpOptions, UseHttpResult } from './nuxt'

export type CreateGetOptions<T extends HttpKey, P extends HttpParam> = Omit<UseHttpOptions<T, P>, 'url'>

export type CreateGetPayload<T extends HttpKey, P extends HttpParam> = Pick<
  UseHttpOptions<T, P>,
  'effect' | 'isError' | 'mapParams'
>

export type CreateGetResult<T extends HttpKey, P extends HttpParam> = UseHttpResult<T, P>

export function createUseCase<D>() {
  return <T>(
    callback: (payload: D & { httpClient: HttpClient }) => T,
  ): ((payload: D & { httpClient: HttpClient }) => T) => callback
}

export function defineGet(useHttp: UseHttpFn) {
  return function withParams<P extends HttpParam>() {
    return function withUrl<T extends HttpKey>(
      url: T,
      payload?: CreateGetPayload<T, P>,
    ): (options?: CreateGetOptions<T, P>) => Promise<CreateGetResult<T, P>> {
      return async function request(options: CreateGetOptions<T, P> = {}): Promise<CreateGetResult<T, P>> {
        const result = await useHttp({
          ...options,
          effect: (...args) => {
            const [data, config] = args

            payload?.effect?.(data, config)
            options?.effect?.(data, config)
          },
          isError: options.isError ?? payload?.isError,
          mapParams: options.mapParams ?? payload?.mapParams,
          url,
        })

        return result
      }
    }
  }
}
