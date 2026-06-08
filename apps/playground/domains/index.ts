import type { HttpClient } from '@brickflow/http'

import { type CatalogUseCase, createCatalogUseCase } from './catalog/use-case'
import { createSystemUseCase, type SystemUseCase } from './system/use-case'

export interface PlaygroundDi {
  catalog: CatalogUseCase
  system: SystemUseCase
}

export function createPlaygroundDi(dependencies: { httpClient: HttpClient }): PlaygroundDi {
  return {
    catalog: createCatalogUseCase(),
    system: createSystemUseCase(dependencies.httpClient),
  }
}
