import type { HttpClient } from '@brickflow/http'

import type { PlaygroundDi } from '../domains'

declare module '#app' {
  interface NuxtApp {
    $di: PlaygroundDi
    $http: HttpClient
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $di: PlaygroundDi
    $http: HttpClient
  }
}

export {}
