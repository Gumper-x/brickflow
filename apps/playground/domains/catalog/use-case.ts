import type { HttpParam } from '#brickflow-http/http'
import type { CreateGetOptions, CreateGetResult } from '#brickflow-http/nuxt'

import { createGet } from '../../core/util'

export interface ProductQueryParams extends HttpParam {
  limit: number
  select: string
  skip: number
}

export const DEFAULT_PRODUCT_QUERY_PARAMS: ProductQueryParams = {
  limit: 4,
  select: 'title,price,category,thumbnail,rating',
  skip: 0,
}

export interface CatalogUseCase {
  featured: FeaturedProductsRequest
}

type FeaturedProductsRequest = (
  options?: CreateGetOptions<'/products', ProductQueryParams>,
) => Promise<CreateGetResult<'/products', ProductQueryParams>>

export function createCatalogUseCase(): CatalogUseCase {
  return {
    featured: createGet<ProductQueryParams>()('/products'),
  }
}
