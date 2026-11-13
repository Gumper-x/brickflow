<script lang="ts" setup>
  import { parseIcon } from '#brickflow-ui'

  const { t } = useI18n()
  const screen = useScreen()
  const { $di } = useNuxtApp()
  const { theme } = useTheme()

  const clicks = ref(0)
  const screenReady = ref(false)
  const testLoading = ref(false)
  const inputNumberValue = ref(0)
  const inputNumberValueInput = ref(0)
  const backendIconName = ref('rocket')
  const resolvedIcon = computed(() =>
    parseIcon(backendIconName.value, { allowed: ['rocket', 'cart'], fallback: 'fast' }),
  )

  const activeScreen = computed(() => {
    const screens = ['dk', 'lp', 'tb', 'mb', 'ms'] as const

    return screens.find((key) => screen[key]) ?? 'unknown'
  })
  const product = await $di.product.productOne({
    effect() {
      console.log('Effect productOne')
    },
    initParams: {
      productId: '23',
    },
    server: true,
  })

  function handleTestLoading(): void {
    testLoading.value = true
    setTimeout(() => {
      testLoading.value = false
    }, 3000)
  }

  onMounted(async () => {
    await screen.ready
    screenReady.value = true
  })
</script>

<template>
  <main class="mx-auto max-w-3xl space-y-10 p-6">
    <section class="space-y-4 text-alt-400 hover:bg-alt-950">
      <p class="text-sm font-medium text-plain-500">{{ product.data }}</p>
      <div class="flex flex-wrap items-center gap-3">
        <BrickButton @click="clicks += 1">
          <template #leading><span aria-hidden="true">+</span></template>
          Add item
        </BrickButton>
        <BrickButton
          color="plain"
          variant="solid"
        >
          Secondary
        </BrickButton>
        <BrickButton
          color="win"
          variant="soft"
          to="/demo"
        >
          Link demo
        </BrickButton>
        <BrickButton
          color="danger"
          variant="ghost"
          size="lg"
          square
        >
          ×
        </BrickButton>
        <BrickButton
          color="alt"
          variant="ghost"
        >
          Clicked {{ clicks }} times
        </BrickButton>
      </div>
    </section>

    <section class="space-y-4 text-alt-400">
      <p class="text-sm font-medium text-plain-500">Button loading icon transition</p>
      <div class="flex flex-col flex-wrap items-start gap-3">
        <BrickButton
          :loading="testLoading"
          @click="handleTestLoading"
        >
          TestButton
        </BrickButton>
        <BrickButton
          :loading="testLoading"
          icon="rocket"
          @click="handleTestLoading"
        >
          TestButton
        </BrickButton>
        <BrickButton
          :loading="testLoading"
          trailingIcon="rocket"
          @click="handleTestLoading"
        >
          TestButton
        </BrickButton>
      </div>
    </section>

    <section class="space-y-4">
      <p class="text-sm font-medium text-plain-500">parseIcon: icon name from the backend</p>
      <div class="flex flex-wrap items-center gap-4">
        <select
          v-model="backendIconName"
          aria-label="Backend icon name"
          class="rounded-lg border border-plain-300 bg-plain-50 px-3 py-2 text-sm text-plain-950"
        >
          <option value="rocket">rocket</option>
          <option value="cart">cart</option>
          <option value="unknown">unknown</option>
        </select>
        <BrickIcon
          :name="resolvedIcon"
          class="text-2xl"
        />
        <span class="text-sm text-plain-500">{{ backendIconName }} → {{ resolvedIcon }}</span>
      </div>
      <p class="text-sm text-plain-500">Allowed: rocket, cart · fallback: x</p>
    </section>

    <ClientOnly>{{ theme }}</ClientOnly>
    <section class="space-y-4">
      <p class="text-sm font-medium text-plain-500">useScreen</p>
      <p class="text-sm text-plain-300">
        <template v-if="screenReady">
          {{ t('Active range') }}: {{ t('Active range2') }}:
          <strong>{{ activeScreen }}</strong>
        </template>
        <template v-else>Detecting screen size…</template>
      </p>
      <div class="grid gap-2 rounded-lg bg-plain-100 p-3 text-sm font-medium text-plain-700">
        <p
          v-if="screen.dk"
          :class="screen.dkClass"
        >
          dk: 1440px and up
        </p>
        <p
          v-if="screen.lp"
          :class="screen.lpClass"
        >
          lp: 1024px–1439px
        </p>
        <p
          v-if="screen.tb"
          :class="screen.tbClass"
        >
          tb: 768px–1023px
        </p>
        <p
          v-if="screen.mb"
          :class="screen.mbClass"
        >
          mb: 480px–767px
        </p>
        <p
          v-if="screen.ms"
          :class="screen.msClass"
        >
          ms: under 480px
        </p>
      </div>
    </section>

    <section class="space-y-4">
      <p class="text-sm font-medium text-plain-500">Input Number Value: {{ inputNumberValue }}</p>
      <p class="text-sm font-medium text-plain-500">Input Number Value Input: {{ inputNumberValueInput }}</p>
      <BrickInputNumber
        :value="inputNumberValue"
        :min="2"
        :max="30"
        @input="inputNumberValueInput = $event"
        @change="inputNumberValue = Number($event)"
      />
    </section>
  </main>
</template>
