import type {
  GetConfig,
  HttpClient,
  HttpErrorPayload,
  HttpParam,
  HttpPayload,
  HttpResponse,
  PostConfig,
} from './shared'

declare global {
  interface BrickflowHttpRouteMap {}
}

export type HttpRouteBody<TRoute extends HttpRouteDefinition> = TRoute extends { body: infer TBody }
  ? TBody extends FormData | Record<string, unknown>
    ? TBody
    : FormData | Record<string, unknown>
  : FormData | Record<string, unknown>

export type HttpRouteData<TRoute extends HttpRouteDefinition> = TRoute extends { data: infer TData }
  ? TData
  : unknown

export interface HttpRouteDefinition {
  body?: FormData | Record<string, unknown>
  data?: unknown
  error?: HttpErrorPayload
  params?: HttpParam
}

export type HttpRouteError<TRoute extends HttpRouteDefinition> = TRoute extends { error: infer TError }
  ? TError extends HttpErrorPayload
    ? TError
    : HttpErrorPayload
  : HttpErrorPayload

export interface HttpRouteMap extends BrickflowHttpRouteMap {}

export type HttpRouteParams<TRoute extends HttpRouteDefinition> = TRoute extends { params: infer TParams }
  ? TParams extends HttpParam
    ? TParams
    : HttpParam
  : HttpParam

export type ResolveHttpRoute<TRoutes, TUrl extends string> =
  TUrl extends KnownHttpRoute<TRoutes> ? HttpRouteLike<TRoutes[TUrl]> : HttpRouteDefinition

export interface StrictTypedHttpClient<TRoutes = HttpRouteMap> {
  get<TUrl extends KnownHttpRoute<TRoutes>>(
    url: TUrl,
    config?: TypedGetConfig<TRoutes, TUrl>,
  ): Promise<TypedHttpResponse<TRoutes, TUrl>>
  post<TUrl extends KnownHttpRoute<TRoutes>>(
    url: TUrl,
    data?: HttpRouteBody<ResolveHttpRoute<TRoutes, TUrl>>,
    config?: TypedPostConfig<TRoutes, TUrl>,
  ): Promise<TypedHttpResponse<TRoutes, TUrl>>
}

export type TypedGetConfig<TRoutes, TUrl extends string> = GetConfig<
  HttpRouteParams<ResolveHttpRoute<TRoutes, TUrl>>,
  HttpRouteError<ResolveHttpRoute<TRoutes, TUrl>>
>

export interface TypedHttpClient<TRoutes = HttpRouteMap> extends Omit<HttpClient, 'get' | 'post'> {
  get<TUrl extends KnownHttpRoute<TRoutes>>(
    url: TUrl,
    config?: TypedGetConfig<TRoutes, TUrl>,
  ): Promise<TypedHttpResponse<TRoutes, TUrl>>
  get<TData = unknown, TParams extends HttpParam = HttpParam, TError extends HttpErrorPayload = HttpErrorPayload>(
    url: string,
    config?: GetConfig<TParams, TError>,
  ): Promise<HttpResponse<HttpPayload<TData, TError>>>

  post<TUrl extends KnownHttpRoute<TRoutes>>(
    url: TUrl,
    data?: HttpRouteBody<ResolveHttpRoute<TRoutes, TUrl>>,
    config?: TypedPostConfig<TRoutes, TUrl>,
  ): Promise<TypedHttpResponse<TRoutes, TUrl>>
  post<TData = unknown, TParams extends HttpParam = HttpParam, TError extends HttpErrorPayload = HttpErrorPayload>(
    url: string,
    data?: FormData | Record<string, unknown>,
    config?: PostConfig<TParams, TError>,
  ): Promise<HttpResponse<HttpPayload<TData, TError>>>
}

export type TypedHttpResponse<TRoutes, TUrl extends string> = HttpResponse<
  HttpPayload<HttpRouteData<ResolveHttpRoute<TRoutes, TUrl>>, HttpRouteError<ResolveHttpRoute<TRoutes, TUrl>>>
>

export type TypedPostConfig<TRoutes, TUrl extends string> = PostConfig<
  HttpRouteParams<ResolveHttpRoute<TRoutes, TUrl>>,
  HttpRouteError<ResolveHttpRoute<TRoutes, TUrl>>
>

type HttpRouteLike<TValue> = TValue extends HttpRouteDefinition ? TValue : HttpRouteDefinition

type KnownHttpRoute<TRoutes> = Extract<keyof TRoutes, string>

export function createStrictHttpClient<TRoutes = HttpRouteMap>(
  client: HttpClient,
): StrictTypedHttpClient<TRoutes> {
  return client as StrictTypedHttpClient<TRoutes>
}

export function createTypedHttpClient<TRoutes = HttpRouteMap>(client: HttpClient): TypedHttpClient<TRoutes> {
  return client as TypedHttpClient<TRoutes>
}

export function defineHttpRoutes<const TRoutes extends Record<string, HttpRouteDefinition>>(
  routes: TRoutes,
): TRoutes {
  return routes
}
