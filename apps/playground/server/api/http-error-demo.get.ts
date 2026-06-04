export default defineEventHandler((event) => {
  setResponseStatus(event, 500)

  return {
    kind: 'playground_demo',
    message: 'Playground demo error from Nitro endpoint.',
    status: 'error',
  }
})
