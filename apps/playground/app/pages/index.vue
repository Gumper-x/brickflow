<script setup lang="ts">
  const brickflow = usebrickflow()
  const { $http } = useNuxtApp()
  const directBaseUrl = 'https://dummyjson.com'
  const proxyBaseUrl = '/api/dummyjson'
  const apiBaseUrl = useState('playground-http-base-url', () => directBaseUrl)

  const initialParams = {
    limit: 4,
    select: 'title,price,category,thumbnail,rating',
    skip: 0,
  } as const

  const featuredProductsState = await useHttp({
    initParams: initialParams,
    server: true,
    url: '/products',
  })

  const apiCheck = await useAsyncData('dummyjson-test', async () => {
    const response = await $http.get('/test')

    return response.data
  })

  const featuredProducts = computed(() => featuredProductsState.data?.products ?? [])
  const featuredTotal = computed(() => featuredProductsState.data?.total ?? 0)
  const apiMethod = computed(() => apiCheck.data.value?.method ?? null)
  const apiRouteMode = computed(() => (apiBaseUrl.value === proxyBaseUrl ? 'Local proxy' : 'Direct origin'))
  const apiStatus = computed(() => apiCheck.data.value?.status ?? 'unavailable')
  const isProxyMode = computed(() => apiBaseUrl.value === proxyBaseUrl)

  async function applyBaseUrl(nextBaseUrl: string): Promise<void> {
    apiBaseUrl.value = nextBaseUrl
    await refreshExamples()
  }

  async function loadNextProducts(): Promise<void> {
    const payload = featuredProductsState.data
    const nextSkip = (payload?.skip ?? initialParams.skip) + initialParams.limit

    await featuredProductsState.fetch({
      ...initialParams,
      skip: nextSkip,
    })
  }

  async function refreshExamples(): Promise<void> {
    await Promise.all([
      apiCheck.refresh(),
      featuredProductsState.fetch({
        ...initialParams,
        skip: 0,
      }),
    ])
  }

  async function triggerHandledError(): Promise<void> {
    await $http.get('/api/http-error-demo')
  }
</script>

<template>
  <main
    class="min-h-screen bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.95),rgba(247,237,232,0.9)_42%,rgba(236,219,212,0.92))] px-6 py-16 text-zinc-950"
  >
    <section class="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <div class="grid gap-6">
        <div class="grid gap-3">
          <span class="text-xs font-semibold uppercase tracking-[0.3em] text-brick-600">brickflow UI</span>
          <h1 class="max-w-2xl text-5xl font-semibold tracking-[-0.04em] text-ink-950">
            `@brickflow/http` is live in the playground.
          </h1>
          <p
            class="max-w-xl text-base/7 text-zinc-700"
            data-testid="brickflow-message"
          >
            {{ brickflow.message }}
          </p>
          <p class="max-w-2xl text-sm/6 text-zinc-600">
            This page fetches live data from DummyJSON with
            <code>useHttp()</code>
            for the product list and
            <code>$http.get('/test')</code>
            for a plain typed route call. The host is injected later by global request middleware, and you can
            switch it below without changing the request code.
          </p>
          <p class="max-w-2xl text-sm/6 text-zinc-600">
            Global middleware is registered in
            <code>app/plugins/http-middleware.ts</code>
            : request middleware adds
            <code>X-Playground-Http</code>
            , sets
            <code>request.baseURL</code>
            from shared state, and response middleware logs DummyJSON responses in dev.
          </p>
        </div>
        <div class="flex flex-wrap gap-3">
          <BrickButton>Try BrickButton</BrickButton>
          <BrickButton
            variant="secondary"
            @click="applyBaseUrl(directBaseUrl)"
          >
            Use direct API
          </BrickButton>
          <BrickButton
            variant="secondary"
            @click="applyBaseUrl(proxyBaseUrl)"
          >
            Use local proxy
          </BrickButton>
          <BrickButton
            variant="secondary"
            @click="loadNextProducts"
          >
            Load next products
          </BrickButton>
          <BrickButton
            variant="secondary"
            @click="triggerHandledError"
          >
            Trigger 500 handler
          </BrickButton>
        </div>
        <label
          class="grid max-w-xl gap-2 rounded-[1.5rem] border border-white/70 bg-white/60 p-4 text-sm text-zinc-700"
        >
          <span class="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Dynamic base URL</span>
          <input
            v-model="apiBaseUrl"
            class="rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-mono text-sm text-zinc-950 outline-none transition focus:border-brick-400"
            type="text"
          />
          <span class="text-xs text-zinc-500">
            Request middleware reads this value on every request, prefixes
            <code>/products</code>
            and
            <code>/test</code>
            dynamically, and the preset buttons refetch the same typed calls against another base.
          </span>
        </label>
      </div>
      <BrickDemo />
    </section>

    <section class="mx-auto mt-12 grid max-w-6xl gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <article
        class="rounded-[2rem] border border-white/70 bg-white/70 p-6 shadow-[0_24px_80px_rgba(120,84,63,0.12)] backdrop-blur"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="grid gap-2">
            <span class="text-xs font-semibold uppercase tracking-[0.28em] text-brick-500">HTTP status</span>
            <h2 class="text-2xl font-semibold tracking-[-0.03em] text-zinc-950">External API check</h2>
          </div>
          <span
            class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700"
          >
            {{ apiStatus }}
          </span>
        </div>

        <div class="mt-6 grid gap-4 text-sm text-zinc-700">
          <div class="rounded-2xl bg-zinc-950 px-4 py-3 font-mono text-zinc-100">GET {{ apiBaseUrl }}/test</div>
          <div class="grid gap-1 rounded-2xl border border-zinc-200/80 bg-white px-4 py-3">
            <span class="text-xs uppercase tracking-[0.2em] text-zinc-500">Current route mode</span>
            <strong class="text-base text-zinc-950">{{ apiRouteMode }}</strong>
          </div>
          <div class="grid gap-1 rounded-2xl border border-zinc-200/80 bg-white px-4 py-3">
            <span class="text-xs uppercase tracking-[0.2em] text-zinc-500">Response method</span>
            <strong class="text-base text-zinc-950">{{ apiMethod ?? 'pending' }}</strong>
          </div>
          <div class="grid gap-1 rounded-2xl border border-zinc-200/80 bg-white px-4 py-3">
            <span class="text-xs uppercase tracking-[0.2em] text-zinc-500">Dynamic base URL</span>
            <code class="text-sm text-zinc-950">{{ apiBaseUrl }}</code>
          </div>
          <div class="grid gap-1 rounded-2xl border border-zinc-200/80 bg-white px-4 py-3">
            <span class="text-xs uppercase tracking-[0.2em] text-zinc-500">Typed call</span>
            <code class="text-sm text-zinc-950">$http.get('/test')</code>
          </div>
          <div class="grid gap-1 rounded-2xl border border-zinc-200/80 bg-white px-4 py-3">
            <span class="text-xs uppercase tracking-[0.2em] text-zinc-500">Behavior</span>
            <span class="text-sm text-zinc-700">
              {{
                isProxyMode
                  ? 'Requests go through Nitro proxy /api/dummyjson/*.'
                  : 'Requests go directly to DummyJSON.'
              }}
            </span>
          </div>
        </div>
      </article>

      <article
        class="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_rgba(120,84,63,0.12)] backdrop-blur"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="grid gap-2">
            <span class="text-xs font-semibold uppercase tracking-[0.28em] text-brick-500">Typed collection</span>
            <h2 class="text-2xl font-semibold tracking-[-0.03em] text-zinc-950">Featured products</h2>
            <p class="text-sm/6 text-zinc-600">
              <code>useHttp({ url: '/products', initParams })</code>
              works without explicit generics because the route types are declared once in
              <code>BrickflowHttpRouteMap</code>
              , and the request middleware resolves the final host at runtime.
            </p>
          </div>
          <div class="rounded-2xl bg-brick-50 px-4 py-3 text-right">
            <div class="text-xs uppercase tracking-[0.2em] text-brick-500">Total catalog</div>
            <div class="text-2xl font-semibold text-brick-900">{{ featuredTotal }}</div>
          </div>
        </div>

        <div
          v-if="featuredProductsState.pending && featuredProducts.length === 0"
          class="mt-6 rounded-2xl border border-dashed border-zinc-300 px-4 py-8 text-sm text-zinc-500"
        >
          Loading products from DummyJSON...
        </div>

        <div
          v-else
          class="mt-6 grid gap-4 sm:grid-cols-2"
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
      </article>

      <article
        class="rounded-[2rem] border border-rose-200/70 bg-rose-50/80 p-6 shadow-[0_24px_80px_rgba(120,84,63,0.08)]"
      >
        <div class="grid gap-3">
          <span class="text-xs font-semibold uppercase tracking-[0.28em] text-rose-500">Error handler</span>
          <h2 class="text-2xl font-semibold tracking-[-0.03em] text-zinc-950">Handled 500 demo</h2>
          <p class="max-w-2xl text-sm/6 text-zinc-700">
            The button above calls
            <code>$http.get('/api/http-error-demo')</code>
            . That endpoint returns HTTP
            <code>500</code>
            and a payload with
            <code>status: 'error'</code>
            , so the package-level error handler triggers Nuxt
            <code>showError()</code>
            automatically.
          </p>
          <div class="rounded-2xl bg-zinc-950 px-4 py-3 font-mono text-sm text-zinc-100">
            GET /api/http-error-demo -&gt; { status: 'error', kind: 'playground_demo', message: '...' }
          </div>
        </div>
      </article>
    </section>
  </main>
</template>
