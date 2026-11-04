import { defineOnResponse } from '@brickflow/http'

export const handlePlaygroundResponse = defineOnResponse(({ context, response }) => {
  if (context.attempt < 3) {
    return { action: 'retry' }
  }
  console.log(context.attempt, response.meta.ignore?.(response.data))
})
