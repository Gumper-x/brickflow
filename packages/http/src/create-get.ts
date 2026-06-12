import type { HttpClient, HttpKey, HttpParam, HttpResponseData } from './http'
import type { HttpError, UseHttpFn, UseHttpOptions, UseHttpResult } from './nuxt'

export interface CreateGetFactory<P extends HttpParam> {
  <T extends HttpKey>(
    url: T,
    payload?: CreateGetPayload<T, P>,
  ): (options?: CreateGetOptions<T, P>) => Promise<CreateGetResult<T, P>>
  <D>(
    url: HttpKey,
    payload?: CreateGetPayload<HttpKey, P, D>,
  ): (options?: CreateGetOptions<HttpKey, P, D>) => Promise<CreateGetResult<HttpKey, P, D>>
}
export type CreateGetOptions<T extends HttpKey, P extends HttpParam, D = never> = Omit<
  UseHttpOptions<T, P>,
  'effect' | 'isError' | 'url'
> & {
  effect?: CreateGetEffect<T, P, D>
  isError?: CreateGetIsError<T, D>
}
export type CreateGetPayload<T extends HttpKey, P extends HttpParam, D = never> = {
  effect?: CreateGetEffect<T, P, D>
  isError?: CreateGetIsError<T, D>
  mapParams?: UseHttpOptions<T, P>['mapParams']
}
export type CreateGetResult<T extends HttpKey, P extends HttpParam, D = never> = Omit<
  UseHttpResult<T, P>,
  'data' | 'error'
> & {
  data: Exclude<CreateGetData<T, D>, HttpError> | null
  error: Extract<CreateGetData<T, D>, HttpError> | null
}

type CreateGetData<T extends HttpKey, D> = [D] extends [never] ? HttpResponseData<T> : D

type CreateGetEffect<T extends HttpKey, P extends HttpParam, D = never> = (
  data: CreateGetData<T, D>,
  config: CreateGetEffectConfig<P>,
) => void

type CreateGetEffectConfig<P extends HttpParam> = {
  cached: boolean
  params: P
}

type CreateGetIsError<T extends HttpKey, D = never> = (payload: CreateGetData<T, D>) => boolean

export function createUseCase<D>() {
  return <T>(
    callback: (payload: D & { httpClient: HttpClient }) => T,
  ): ((payload: D & { httpClient: HttpClient }) => T) => callback
}

export function defineGet(useHttp: UseHttpFn) {
  return function withParams<P extends HttpParam>(): CreateGetFactory<P> {
    function withUrl<T extends HttpKey, D = never>(
      url: T,
      payload?: CreateGetPayload<T, P, D>,
    ): (options?: CreateGetOptions<T, P, D>) => Promise<CreateGetResult<T, P, D>> {
      return async function request(options: CreateGetOptions<T, P, D> = {}): Promise<CreateGetResult<T, P, D>> {
        const result = await useHttp({
          ...options,
          effect: (data, config) => {
            payload?.effect?.(data as CreateGetData<T, D>, config)
            options?.effect?.(data as CreateGetData<T, D>, config)
          },
          isError: options.isError ?? payload?.isError,
          mapParams: options.mapParams ?? payload?.mapParams,
          url,
        } as UseHttpOptions<T, P>)

        return result as CreateGetResult<T, P, D>
      }
    }

    return withUrl as CreateGetFactory<P>
  }
}
