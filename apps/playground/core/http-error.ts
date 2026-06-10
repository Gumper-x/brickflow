import type { CreateHttpOptions } from '@brickflow/http'

export function handlePlaygroundResponse(
  response: Parameters<NonNullable<CreateHttpOptions['onResponse']>>[0],
): void {
  console.log(response.config.ignore?.(response.data))
}
