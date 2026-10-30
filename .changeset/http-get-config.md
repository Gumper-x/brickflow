---
'@brickflow/http': patch
---

http: add `config` option to `createGet`/`useHttp` to pass extended `HttpConfig` (e.g. `ignore`) to `httpClient.get`; fix TS2590 "union type too complex" in `onResponse` with large schemas
