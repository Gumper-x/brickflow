import type { HttpRequestMiddleware, HttpResponseMiddleware } from './shared'

const requestMiddlewares = new Set<HttpRequestMiddleware>()
const responseMiddlewares = new Set<HttpResponseMiddleware>()

export function addHttpRequestMiddleware(middleware: HttpRequestMiddleware): void {
  requestMiddlewares.add(middleware)
}

export function addHttpResponseMiddleware(middleware: HttpResponseMiddleware): void {
  responseMiddlewares.add(middleware)
}

export function getHttpRequestMiddlewares(): HttpRequestMiddleware[] {
  return [...requestMiddlewares]
}

export function getHttpResponseMiddlewares(): HttpResponseMiddleware[] {
  return [...responseMiddlewares]
}

export function removeHttpRequestMiddleware(middleware: HttpRequestMiddleware): void {
  requestMiddlewares.delete(middleware)
}

export function removeHttpResponseMiddleware(middleware: HttpResponseMiddleware): void {
  responseMiddlewares.delete(middleware)
}
