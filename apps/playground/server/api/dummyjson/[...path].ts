export default defineEventHandler(async (event) => {
  const path = event.context.params?.path ?? ''
  const query = getQuery(event)
  const targetUrl = new URL(`https://dummyjson.com/${path}`)

  Object.entries(query).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined) {
          targetUrl.searchParams.append(key, String(item))
        }
      })

      return
    }

    if (value !== undefined) {
      targetUrl.searchParams.set(key, String(value))
    }
  })

  const response = await fetch(targetUrl, {
    headers: {
      Accept: 'application/json',
    },
  })

  setResponseStatus(event, response.status, response.statusText)

  return await response.json()
})
