import type { HttpParam } from './http'

export function createURL(url: string, params?: HttpParam): string {
  const resolved = resolveUrlParams(url, params)
  const urlParams = new URLSearchParams()

  Object.entries(resolved.params ?? {}).forEach(([key, value]) => {
    if (value === undefined) {
      return
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        urlParams.append(`${key}[]`, item)
      })
      return
    }

    urlParams.append(key, String(value))
  })

  const query = urlParams.size > 0 ? `?${urlParams}` : ''
  return urlParams.size > 0 ? `${resolved.url}${query}` : resolved.url
}

export function fastDevHash(data: unknown): string {
  const str = JSON.stringify(data)
  let hash = 0

  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i)
    hash = (hash << 5) - hash + chr
    hash |= 0
  }

  return Math.abs(hash).toString(16)
}

export async function hashData(data: unknown): Promise<string> {
  const subtle = globalThis.crypto?.subtle

  if (subtle) {
    const encoded = new TextEncoder().encode(JSON.stringify(data))
    const buffer = await subtle.digest('SHA-1', encoded)
    const array = Array.from(new Uint8Array(buffer))

    return array.map((value) => value.toString(16).padStart(2, '0')).join('')
  }

  return fastDevHash(data)
}

export function resolveUrlParams(
  url: string,
  params?: HttpParam,
): {
  params: HttpParam | undefined
  url: string
} {
  if (!params) {
    return {
      params,
      url,
    }
  }

  const usedKeys: Record<string, true> = {}
  const resolvedUrl = url.replaceAll(/:(\w+)/g, (segment, key: string) => {
    const value = params[key]

    if (value === undefined) {
      return segment
    }

    usedKeys[key] = true
    return encodeURIComponent(String(value))
  })
  const queryParams = Object.entries(params).reduce<HttpParam>((acc, [key, value]) => {
    if (usedKeys[key]) {
      return acc
    }

    acc[key] = value
    return acc
  }, {})

  return {
    params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    url: resolvedUrl,
  }
}
