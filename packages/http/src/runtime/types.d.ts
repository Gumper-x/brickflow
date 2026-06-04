import type { HttpRouteMap, TypedHttpClient } from './utils/typed'

declare module '#app' {
  interface NuxtApp {
    $http: TypedHttpClient<HttpRouteMap>
  }
}

declare module 'nuxt/app' {
  interface NuxtApp {
    $http: TypedHttpClient<HttpRouteMap>
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $http: TypedHttpClient<HttpRouteMap>
  }
}

export {}
