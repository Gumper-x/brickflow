<script setup lang="ts">
  import { DIRECT_BASE_URL, PROXY_BASE_URL, usePlaygroundBaseUrl } from '../core/util'
  import { DEFAULT_PRODUCT_QUERY_PARAMS } from '../domains/catalog/use-case'

  const brickflow = usebrickflow()
  const app = useNuxtApp()
  const apiBaseUrl = usePlaygroundBaseUrl()
  const lastProductsEffect = ref<null | { cached: boolean; skip: number }>(null)

  const featuredProductsState = await app.$di.catalog.featured({
    effect(_data, config) {
      lastProductsEffect.value = {
        cached: config.cached,
        skip: config.params.skip,
      }
    },
    initParams: DEFAULT_PRODUCT_QUERY_PARAMS,
    server: true,
  })

  const handledErrorState = await app.$di.system.errorDemo({
    lazy: true,
    server: false,
  })

  const apiCheck = await useAsyncData('playground-http-test', async () => {
    return await app.$di.system.healthCheck()
  })

  const featuredProducts = computed(() => featuredProductsState.data?.products ?? [])
  const featuredTotal = computed(() => featuredProductsState.data?.total ?? 0)
  const currentSkip = computed(() => featuredProductsState.data?.skip ?? DEFAULT_PRODUCT_QUERY_PARAMS.skip)
  const apiMethod = computed(() => apiCheck.data.value?.method ?? 'pending')
  const apiRouteMode = computed(() => (apiBaseUrl.value === PROXY_BASE_URL ? 'Local proxy' : 'Direct origin'))
  const apiStatus = computed(() => apiCheck.data.value?.status ?? 'pending')
  const errorKind = computed(() => handledErrorState.error?.kind ?? 'not_requested')
  const errorMessage = computed(() => handledErrorState.error?.message ?? 'Run the request to inspect the error.')
  const errorStatus = computed(() => handledErrorState.error?.status ?? 'idle')
  const isProxyMode = computed(() => apiBaseUrl.value === PROXY_BASE_URL)
  const productsEffectSummary = computed(() => {
    if (!lastProductsEffect.value) {
      return 'effect() has not run yet.'
    }

    return `${lastProductsEffect.value.cached ? 'cache' : 'network'} payload for skip=${lastProductsEffect.value.skip}`
  })

  const structureSnippet = [
    'types/http.d.ts',
    'plugins/01.di.ts',
    'core/util.ts',
    'domains/catalog/use-case.ts',
    'domains/system/use-case.ts',
    'app/pages/index.vue',
  ].join('\n')
  const pluginSnippet = [
    'const httpClient = createRuntimeHttpClient()',
    '',
    'return {',
    '  provide: {',
    '    http: httpClient,',
    '    di: createPlaygroundDi({ httpClient }),',
    '  },',
    '}',
  ].join('\n')
  const createGetSnippet = [
    'const useHttp = createUseHttp({ getHttpClient: () => useNuxtApp().$http, isDev: () => import.meta.dev })',
    'export const createGet = createHttpGet(useHttp)',
    "featured: createGet<ProductQueryParams>()('/products')",
  ].join('\n')
  const requestSnippet = [
    'const featuredProductsHttp = await app.$di.catalog.featured({',
    '  initParams: DEFAULT_PRODUCT_QUERY_PARAMS,',
    '  server: true,',
    '})',
    '',
    'await featuredProductsHttp.fetch({',
    '  ...DEFAULT_PRODUCT_QUERY_PARAMS,',
    '  skip: DEFAULT_PRODUCT_QUERY_PARAMS.skip + DEFAULT_PRODUCT_QUERY_PARAMS.limit,',
    '})',
  ].join('\n')
  const errorSnippet = [
    "errorDemo: createLocalGet<Record<string, never>>()('/api/http-error-demo')",
    '',
    'const handledErrorState = await app.$di.system.errorDemo({',
    '  lazy: true,',
    '  server: false,',
    '})',
  ].join('\n')

  async function applyBaseUrl(nextBaseUrl: string): Promise<void> {
    apiBaseUrl.value = nextBaseUrl
    await refreshExamples()
  }

  async function loadNextProducts(): Promise<void> {
    await featuredProductsState.fetch({
      ...DEFAULT_PRODUCT_QUERY_PARAMS,
      skip: currentSkip.value + DEFAULT_PRODUCT_QUERY_PARAMS.limit,
    })
  }

  async function refreshExamples(): Promise<void> {
    await Promise.all([
      apiCheck.refresh(),
      featuredProductsState.fetch({
        ...DEFAULT_PRODUCT_QUERY_PARAMS,
        skip: 0,
      }),
    ])
  }

  async function triggerHandledError(): Promise<void> {
    await handledErrorState.fetch()
  }
</script>

<template>
  <main
    class="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(247,237,232,0.9)_42%,rgba(236,219,212,0.92))] px-6 py-16 text-zinc-950"
  >
    <section class="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <div class="grid gap-6">
        <div class="grid gap-3">
          <span class="text-xs font-semibold uppercase tracking-[0.3em] text-brick-600">playground examples</span>
          <h1 class="max-w-3xl text-5xl font-semibold tracking-[-0.04em] text-ink-950">
            Playground now mirrors the HTTP README with real plugin wiring.
          </h1>
          <p
            class="max-w-xl text-base/7 text-zinc-700"
            data-testid="brickflow-message"
          >
            {{ brickflow.message }}
          </p>
          <p class="max-w-2xl text-sm/6 text-zinc-600">
            The example is split into the same three flows described in
            <code>@brickflow/http</code>
            docs, but now the wiring lives in real project files:
            <code>plugins/01.di.ts</code>
            ,
            <code>core/util.ts</code>
            , and
            <code>domains/*/use-case.ts</code>
            .
          </p>
          <p class="max-w-2xl text-sm/6 text-zinc-600">
            The plugin provides
            <code>$http</code>
            and
            <code>$di</code>
            . The page only consumes domain methods, so this playground is now a direct implementation sample, not
            an inline demo.
          </p>
          <pre
            class="max-w-xl overflow-x-auto rounded-2xl bg-zinc-950 px-4 py-3 text-xs/6 text-zinc-100"
          ><code>{{ structureSnippet }}</code></pre>
        </div>

        <div class="flex flex-wrap gap-3">
          <BrickButton>Try BrickButton</BrickButton>
          <BrickButton
            variant="secondary"
            @click="applyBaseUrl(DIRECT_BASE_URL)"
          >
            Use direct API
          </BrickButton>
          <BrickButton
            variant="secondary"
            @click="applyBaseUrl(PROXY_BASE_URL)"
          >
            Use local proxy
          </BrickButton>
          <BrickButton
            variant="secondary"
            @click="refreshExamples"
          >
            Refresh examples
          </BrickButton>
          <BrickButton
            variant="secondary"
            @click="loadNextProducts"
          >
            Fetch next page
          </BrickButton>
          <BrickButton
            variant="secondary"
            @click="triggerHandledError"
          >
            Run error demo
          </BrickButton>
        </div>

        <label
          class="grid max-w-xl gap-2 rounded-[1.5rem] border border-white/70 bg-white/60 p-4 text-sm text-zinc-700"
        >
          <span class="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Runtime base URL</span>
          <input
            v-model="apiBaseUrl"
            class="rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-mono text-sm text-zinc-950 outline-none transition focus:border-brick-400"
            type="text"
          />
          <span class="text-xs text-zinc-500">
            Both the direct health check and the typed
            <code>/products</code>
            request reuse this value. Edit it manually, then press
            <code>Refresh examples</code>
            to rerun the same calls against another origin.
          </span>
        </label>
      </div>

      <BrickDemo />
    </section>

    <section class="mx-auto mt-12 grid max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <article
        class="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-[0_24px_80px_rgba(120,84,63,0.12)] backdrop-blur"
      >
        <div class="grid gap-4">
          <div class="grid gap-2">
            <span class="text-xs font-semibold uppercase tracking-[0.28em] text-brick-500">1. createHttp()</span>
            <h2 class="text-2xl font-semibold tracking-[-0.03em] text-zinc-950">One-shot request example</h2>
            <p class="text-sm/6 text-zinc-600">
              The low-level client is created once in
              <code>plugins/01.di.ts</code>
              and exposed as
              <code>$http</code>
              . The direct domain method then uses it for
              <code>GET /test</code>
              without any async-state wrapper.
            </p>
          </div>

          <pre
            class="overflow-x-auto rounded-2xl bg-zinc-950 px-4 py-3 text-xs/6 text-zinc-100"
          ><code>{{ pluginSnippet }}</code></pre>

          <div class="grid gap-3 text-sm text-zinc-700">
            <div class="rounded-2xl bg-brick-50 px-4 py-3 font-mono text-brick-950">GET {{ apiBaseUrl }}/test</div>
            <div class="grid gap-1 rounded-2xl border border-zinc-200/80 bg-white px-4 py-3">
              <span class="text-xs uppercase tracking-[0.2em] text-zinc-500">Current route mode</span>
              <strong class="text-base text-zinc-950">{{ apiRouteMode }}</strong>
            </div>
            <div class="grid gap-1 rounded-2xl border border-zinc-200/80 bg-white px-4 py-3">
              <span class="text-xs uppercase tracking-[0.2em] text-zinc-500">Response status</span>
              <strong class="text-base text-zinc-950">{{ apiStatus }}</strong>
            </div>
            <div class="grid gap-1 rounded-2xl border border-zinc-200/80 bg-white px-4 py-3">
              <span class="text-xs uppercase tracking-[0.2em] text-zinc-500">Response method</span>
              <strong class="text-base text-zinc-950">{{ apiMethod }}</strong>
            </div>
            <div class="grid gap-1 rounded-2xl border border-zinc-200/80 bg-white px-4 py-3">
              <span class="text-xs uppercase tracking-[0.2em] text-zinc-500">Behavior</span>
              <span class="text-sm text-zinc-700">
                {{
                  isProxyMode
                    ? 'Requests go through the local Nitro proxy /api/dummyjson/*.'
                    : 'Requests go directly to DummyJSON.'
                }}
              </span>
            </div>
          </div>
        </div>
      </article>

      <article
        class="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(120,84,63,0.12)] backdrop-blur"
      >
        <div class="grid gap-4">
          <div class="grid gap-2">
            <span class="text-xs font-semibold uppercase tracking-[0.28em] text-brick-500">
              2. createUseHttp() + createGet()
            </span>
            <h2 class="text-2xl font-semibold tracking-[-0.03em] text-zinc-950">Reusable typed endpoint</h2>
            <p class="text-sm/6 text-zinc-600">
              The endpoint is bound once in
              <code>core/util.ts</code>
              and
              <code>domains/catalog/use-case.ts</code>
              . The page then consumes the returned state object with
              <code>data</code>
              ,
              <code>pending</code>
              ,
              <code>hasFirstData</code>
              ,
              <code>hasFreshData</code>
              , and
              <code>fetch()</code>
              .
            </p>
          </div>

          <pre
            class="overflow-x-auto rounded-2xl bg-zinc-950 px-4 py-3 text-xs/6 text-zinc-100"
          ><code>{{ createGetSnippet }}</code></pre>
          <pre
            class="overflow-x-auto rounded-2xl bg-zinc-950 px-4 py-3 text-xs/6 text-zinc-100"
          ><code>{{ requestSnippet }}</code></pre>

          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div class="rounded-2xl border border-zinc-200/80 bg-white px-4 py-3">
              <div class="text-xs uppercase tracking-[0.2em] text-zinc-500">pending</div>
              <div class="mt-1 text-lg font-semibold text-zinc-950">{{ featuredProductsState.pending }}</div>
            </div>
            <div class="rounded-2xl border border-zinc-200/80 bg-white px-4 py-3">
              <div class="text-xs uppercase tracking-[0.2em] text-zinc-500">pendingCache</div>
              <div class="mt-1 text-lg font-semibold text-zinc-950">{{ featuredProductsState.pendingCache }}</div>
            </div>
            <div class="rounded-2xl border border-zinc-200/80 bg-white px-4 py-3">
              <div class="text-xs uppercase tracking-[0.2em] text-zinc-500">hasFirstData</div>
              <div class="mt-1 text-lg font-semibold text-zinc-950">{{ featuredProductsState.hasFirstData }}</div>
            </div>
            <div class="rounded-2xl border border-zinc-200/80 bg-white px-4 py-3">
              <div class="text-xs uppercase tracking-[0.2em] text-zinc-500">hasFreshData</div>
              <div class="mt-1 text-lg font-semibold text-zinc-950">{{ featuredProductsState.hasFreshData }}</div>
            </div>
          </div>

          <div class="grid gap-3 text-sm text-zinc-700 sm:grid-cols-3">
            <div class="rounded-2xl bg-brick-50 px-4 py-3">
              <div class="text-xs uppercase tracking-[0.2em] text-brick-500">Total catalog</div>
              <div class="mt-1 text-2xl font-semibold text-brick-900">{{ featuredTotal }}</div>
            </div>
            <div class="rounded-2xl border border-zinc-200/80 bg-white px-4 py-3">
              <div class="text-xs uppercase tracking-[0.2em] text-zinc-500">Current skip</div>
              <div class="mt-1 text-lg font-semibold text-zinc-950">{{ currentSkip }}</div>
            </div>
            <div class="rounded-2xl border border-zinc-200/80 bg-white px-4 py-3">
              <div class="text-xs uppercase tracking-[0.2em] text-zinc-500">Last effect()</div>
              <div class="mt-1 text-sm font-medium text-zinc-950">{{ productsEffectSummary }}</div>
            </div>
          </div>

          <div
            v-if="featuredProductsState.pending && featuredProducts.length === 0"
            class="rounded-2xl border border-dashed border-zinc-300 px-4 py-8 text-sm text-zinc-500"
          >
            Loading products from DummyJSON...
          </div>

          <div
            v-else
            class="grid gap-4 sm:grid-cols-2"
          >
            <article
              v-for="product in featuredProducts"
              :key="product.id"
              class="grid gap-4 rounded-[1.5rem] border border-zinc-200/80 bg-white p-4"
            >
              <img
                :src="product.thumbnail"
                :alt="product.title"
                class="aspect-[4/3] w-full rounded-[1.25rem] object-cover"
                loading="lazy"
              />
              <div class="grid gap-2">
                <div class="flex items-center justify-between gap-4">
                  <span class="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                    {{ product.category }}
                  </span>
                  <span class="text-sm font-medium text-amber-600">★ {{ product.rating }}</span>
                </div>
                <h3 class="text-lg font-semibold tracking-[-0.02em] text-zinc-950">
                  {{ product.title }}
                </h3>
                <div class="text-xl font-semibold text-brick-700">${{ product.price }}</div>
              </div>
            </article>
          </div>
        </div>
      </article>
    </section>

    <section class="mx-auto mt-6 max-w-6xl">
      <article
        class="rounded-[2rem] border border-rose-200/70 bg-rose-50/80 p-6 shadow-[0_24px_80px_rgba(120,84,63,0.08)]"
      >
        <div class="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div class="grid gap-3">
            <span class="text-xs font-semibold uppercase tracking-[0.28em] text-rose-500">
              3. typed error split
            </span>
            <h2 class="text-2xl font-semibold tracking-[-0.03em] text-zinc-950">Local error branch example</h2>
            <p class="max-w-2xl text-sm/6 text-zinc-700">
              This request uses a local endpoint helper from
              <code>domains/system/use-case.ts</code>
              because
              <code>/api/http-error-demo</code>
              is a Nitro route and should not be prefixed with the remote DummyJSON base URL. The returned payload
              lands in
              <code>error</code>
              while
              <code>data</code>
              stays
              <code>null</code>
              .
            </p>

            <pre
              class="overflow-x-auto rounded-2xl bg-zinc-950 px-4 py-3 text-xs/6 text-zinc-100"
            ><code>{{ errorSnippet }}</code></pre>

            <div class="rounded-2xl bg-white/80 px-4 py-3 font-mono text-sm text-zinc-900">
              GET /api/http-error-demo -&gt; { status: 'error', kind: 'playground_demo', message: '...' }
            </div>
          </div>

          <div class="grid gap-3">
            <div class="grid gap-3 sm:grid-cols-3">
              <div class="rounded-2xl border border-rose-200 bg-white/70 px-4 py-3">
                <div class="text-xs uppercase tracking-[0.2em] text-rose-500">status</div>
                <div class="mt-1 text-lg font-semibold text-zinc-950">{{ errorStatus }}</div>
              </div>
              <div class="rounded-2xl border border-rose-200 bg-white/70 px-4 py-3">
                <div class="text-xs uppercase tracking-[0.2em] text-rose-500">kind</div>
                <div class="mt-1 text-lg font-semibold text-zinc-950">{{ errorKind }}</div>
              </div>
              <div class="rounded-2xl border border-rose-200 bg-white/70 px-4 py-3">
                <div class="text-xs uppercase tracking-[0.2em] text-rose-500">data branch</div>
                <div class="mt-1 text-lg font-semibold text-zinc-950">{{ handledErrorState.data === null }}</div>
              </div>
            </div>

            <div class="grid gap-1 rounded-2xl border border-rose-200 bg-white/70 px-4 py-3 text-sm text-zinc-700">
              <span class="text-xs uppercase tracking-[0.2em] text-rose-500">Message</span>
              <strong class="text-base text-zinc-950">{{ errorMessage }}</strong>
            </div>

            <pre
              class="overflow-x-auto rounded-2xl border border-rose-200 bg-white/70 px-4 py-3 text-xs/6 text-zinc-700"
            ><code>{{ JSON.stringify(handledErrorState.error, null, 2) }}</code></pre>
          </div>
        </div>
      </article>
    </section>
  </main>
</template>
