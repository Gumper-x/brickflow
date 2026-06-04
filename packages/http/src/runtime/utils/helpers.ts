export function getRandom(min: number, max: number): number {
  const hasFloat = !Number.isInteger(min) || !Number.isInteger(max)

  return hasFloat ? Math.random() * (max - min) + min : Math.floor(Math.random() * (max - min + 1)) + min
}

export function getRetryDelay(attempt: number, baseDelay: number): number {
  return Math.random() * baseDelay * 2 ** attempt
}

export function isFormData(value?: FormData | Record<string, unknown> | unknown): value is FormData {
  if (!value) {
    return false
  }

  return (
    typeof value === 'object' &&
    typeof (value as Record<string, unknown>).append === 'function' &&
    typeof (value as Record<string, unknown>).has === 'function'
  )
}

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))
