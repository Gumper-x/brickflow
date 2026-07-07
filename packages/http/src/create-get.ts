import type { HttpClient, HttpKey, HttpParam, HttpResponseData } from './http'
import type { HttpError, UseHttpFn, UseHttpOptions, UseHttpResult } from './nuxt'

export interface CreateGetFactory<P extends HttpParam> {
  <T extends string>(
    url: T,
    payload?: CreateGetPayload<T, CreateGetParams<T, P>>,
  ): (options?: CreateGetOptions<T, CreateGetParams<T, P>>) => Promise<CreateGetResult<T, CreateGetParams<T, P>>>
}
export type CreateGetOptions<T extends string, P extends HttpParam> = Omit<
  UseHttpOptions<HttpKey, P>,
  'effect' | 'initParams' | 'isError' | 'url'
> & {
  effect?: CreateGetEffect<T, P>
  initParams?: CreateGetInitParams<P>
  isError?: CreateGetIsError<T>
}
export type CreateGetPayload<T extends string, P extends HttpParam> = {
  effect?: CreateGetEffect<T, P>
  isError?: CreateGetIsError<T>
}
export type CreateGetResult<T extends string, P extends HttpParam> = Omit<
  UseHttpResult<HttpKey, P>,
  'data' | 'error'
> & {
  data: Exclude<CreateGetData<T>, HttpError> | null
  error: Extract<CreateGetData<T>, HttpError> | null
}

type CreateGetData<T extends string> = T extends HttpKey ? HttpResponseData<T> : unknown
type CreateGetEffect<T extends string, P extends HttpParam> = (
  data: CreateGetData<T>,
  config: CreateGetEffectConfig<P>,
) => void
type CreateGetEffectConfig<P extends HttpParam> = {
  cached: boolean
  params: P
}
type CreateGetEmptyParams = Record<never, never>
type CreateGetInitParams<P extends HttpParam> = [keyof P] extends [never] ? never : P

type CreateGetIsError<T extends string> = (payload: CreateGetData<T>) => boolean

type CreateGetParamKeys<T extends string> = T extends `${string}:${infer Rest}`
  ? Rest extends `${infer Key}/${infer Tail}`
    ? CreateGetParamKeys<`/${Tail}`> | Key
    : Rest
  : never
type CreateGetParams<T extends string, P extends HttpParam> = Omit<CreateGetPathParams<T>, keyof P> & P
type CreateGetPathParams<T extends string> = [CreateGetParamKeys<T>] extends [never]
  ? CreateGetEmptyParams
  : {
      [K in CreateGetParamKeys<T>]: string
    }

export function createUseCase<D>() {
  return <T>(
    callback: (payload: D & { httpClient: HttpClient }) => T,
  ): ((payload: D & { httpClient: HttpClient }) => T) => callback
}

export function defineGet(useHttp: UseHttpFn) {
  return function withParams<P extends HttpParam = CreateGetEmptyParams>(): CreateGetFactory<P> {
    function withUrl<T extends string>(
      url: T,
      payload?: CreateGetPayload<T, CreateGetParams<T, P>>,
    ): (
      options?: CreateGetOptions<T, CreateGetParams<T, P>>,
    ) => Promise<CreateGetResult<T, CreateGetParams<T, P>>> {
      return async function request(
        options: CreateGetOptions<T, CreateGetParams<T, P>> = {},
      ): Promise<CreateGetResult<T, CreateGetParams<T, P>>> {
        const result = await useHttp({
          ...options,
          effect: (data, config) => {
            payload?.effect?.(data as CreateGetData<T>, config)
            options?.effect?.(data as CreateGetData<T>, config)
          },
          isError: options.isError ?? payload?.isError,
          url,
        } as UseHttpOptions<HttpKey, CreateGetParams<T, P>>)

        return result as CreateGetResult<T, CreateGetParams<T, P>>
      }
    }

    return withUrl as CreateGetFactory<P>
  }
}
