export interface DbEntry<T> {
  expiresAt: number
  hash: string
  key: string
  value: T
}

const dbCache = new Map<string, Promise<IDBDatabase>>()
const dbVersions = new Map<string, number>()

const DB_PREFIX = 'smart'
const allowDb = ['smart-cache-v2'] as const
type AllowDB = (typeof allowDb)[number]

export async function dbDeleteKeysWithPart(part: string, dbName: AllowDB, storeName: string): Promise<void> {
  const db = await openDB(dbName, storeName)
  const tx = db.transaction(storeName, 'readwrite')
  const store = tx.objectStore(storeName)

  await new Promise<void>((resolve, reject) => {
    const req = store.openCursor()

    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const cursor = req.result
      if (!cursor) {
        resolve()
        return
      }

      const key = cursor.key

      if (typeof key === 'string' && key.startsWith(part) && !key.startsWith(`${part}/`)) {
        cursor.delete()
      }

      cursor.continue()
    }
  })

  await txDone(tx)
}

export async function dbGet<T>(key: string, dbName: AllowDB, storeName: string): Promise<DbEntry<T> | null> {
  const db = await openDB(dbName, storeName)
  const tx = db.transaction(storeName, 'readonly')
  const store = tx.objectStore(storeName)
  const entry = (await requestToPromise(store.get(key))) as DbEntry<T> | undefined

  await txDone(tx)

  if (entry === undefined) {
    return null
  }

  if (entry.expiresAt === undefined || Date.now() > entry.expiresAt) {
    const deleteTx = db.transaction(storeName, 'readwrite')
    deleteTx.objectStore(storeName).delete(key)
    await txDone(deleteTx)

    return null
  }

  return entry
}

export async function dbSafeSet<T>(
  key: string,
  value: T,
  dbName: AllowDB,
  storeName: string,
  ttl: number,
  retries = 1,
): Promise<void> {
  if (retries < 0) {
    throw new Error('IndexedDB quota exceeded permanently')
  }

  const db = await openDB(dbName, storeName)
  const entry: DbEntry<T> = {
    expiresAt: Date.now() + ttl,
    hash: await hashData(value),
    key,
    value,
  }

  try {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)

    if (store.keyPath === null) {
      store.put(entry, key)
    } else {
      store.put(entry)
    }

    await txDone(tx)
  } catch (error) {
    const domError = error as DOMException

    if (domError?.name === 'QuotaExceededError') {
      await dbEvictOldest(dbName, storeName)
      await dbSafeSet(key, value, dbName, storeName, ttl, retries - 1)
      return
    }

    throw domError
  }
}

export async function hashData(data: unknown): Promise<string> {
  const subtle = globalThis.crypto?.subtle

  if (subtle) {
    const encoded = new TextEncoder().encode(JSON.stringify(data))
    const buffer = await subtle.digest('SHA-1', encoded)
    const bytes = Array.from(new Uint8Array(buffer))

    return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('')
  }

  return fastDevHash(data)
}

function attachDbGuards(db: IDBDatabase): void {
  db.onversionchange = () => {
    try {
      db.close()
    } catch {
      // ignore
    }
  }
}

async function cleanupOldDatabases(): Promise<void> {
  if (typeof indexedDB.databases !== 'function') {
    return
  }

  let databases: IDBDatabaseInfo[]

  try {
    databases = await indexedDB.databases()
  } catch (error) {
    console.error(error)
    return
  }

  for (const db of databases) {
    const name = db.name

    if (!name || !name.startsWith(DB_PREFIX) || allowDb.includes(name as AllowDB)) {
      continue
    }

    try {
      indexedDB.deleteDatabase(name)
    } catch {
      // ignore
    }
  }
}

async function dbEvictOldest(dbName: AllowDB, storeName: string): Promise<void> {
  const db = await openDB(dbName, storeName)
  const tx = db.transaction(storeName, 'readwrite')
  const store = tx.objectStore(storeName)
  const total = await requestToPromise(store.count())

  if (total === 0) {
    await txDone(tx)
    return
  }

  const limit = Math.floor(total / 2)

  if (limit === 0 || !store.indexNames.contains('expiresAt')) {
    await txDone(tx)
    return
  }

  const index = store.index('expiresAt')
  let removed = 0

  await new Promise<void>((resolve, reject) => {
    const req = index.openCursor()

    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const cursor = req.result
      if (cursor === null || removed >= limit) {
        resolve()
        return
      }

      cursor.delete()
      removed += 1
      cursor.continue()
    }
  })

  await txDone(tx)

  if (removed === 0 && total > 0) {
    throw new Error('IndexedDB eviction removed 0 items')
  }
}

function fastDevHash(data: unknown): string {
  const text = JSON.stringify(data)
  let hash = 0

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index)
    hash = (hash << 5) - hash + code
    hash |= 0
  }

  return Math.abs(hash).toString(16)
}

async function openDB(dbName: AllowDB, storeName: string): Promise<IDBDatabase> {
  const currentVersion = dbVersions.get(dbName) ?? 1
  const cacheKey = `${dbName}@v${currentVersion}`
  const cached = dbCache.get(cacheKey)

  if (cached !== undefined) {
    return cached
  }

  await cleanupOldDatabases()

  const openAtVersion = (version: number): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
      const req = indexedDB.open(dbName, version)

      req.onupgradeneeded = () => {
        const db = req.result
        let store: IDBObjectStore

        if (db.objectStoreNames.contains(storeName)) {
          const tx = req.transaction

          if (tx === null) {
            throw new Error('[openDB] Missing transaction during upgrade')
          }

          store = tx.objectStore(storeName)
        } else {
          store = db.createObjectStore(storeName, { keyPath: 'key' })
        }

        if (!store.indexNames.contains('expiresAt')) {
          store.createIndex('expiresAt', 'expiresAt')
        }
      }

      req.onblocked = () => reject(new Error(`[openDB] Upgrade blocked for "${dbName}"`))
      req.onsuccess = () => {
        const db = req.result
        attachDbGuards(db)
        resolve(db)
      }
      req.onerror = () => reject(req.error)
    })

  const promise = openAtVersion(currentVersion)
  dbCache.set(cacheKey, promise)

  const db = await promise

  if (db.objectStoreNames.contains(storeName)) {
    dbVersions.set(dbName, currentVersion)
    return db
  }

  try {
    db.close()
  } catch {
    // ignore
  }

  const nextVersion = currentVersion + 1
  dbVersions.set(dbName, nextVersion)

  const upgraded = await openAtVersion(nextVersion)
  dbCache.set(`${dbName}@v${nextVersion}`, Promise.resolve(upgraded))

  return upgraded
}

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Transaction error'))
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'))
  })
}
