import { createUseHttp, defineGet } from '@brickflow/http'

import { dbDeleteKeysWithPart, dbGet, dbSafeSet } from './indexdb'

const CACHE_DB_NAME = 'smart-cache-v2'
const CACHE_STORE_NAME = 'playground-http'

const useHttp = createUseHttp({
  getCache: () => ({
    deleteKeysWithPart: async (part: string) => await dbDeleteKeysWithPart(part, CACHE_DB_NAME, CACHE_STORE_NAME),
    get: async <T>(key: string) => await dbGet<T>(key, CACHE_DB_NAME, CACHE_STORE_NAME),
    set: async <T>(key: string, value: T, ttl: number) =>
      await dbSafeSet<T>(key, value, CACHE_DB_NAME, CACHE_STORE_NAME, ttl),
  }),
  getHttpClient: () => useNuxtApp().$http,
  isDev: () => false,
})

export const createGet = defineGet(useHttp)
