<script lang="ts" setup>
  const { t } = useI18n()
  const screen = useScreen()
  const { $di } = useNuxtApp()
  const clicks = ref(0)
  const screenReady = ref(false)

  const activeScreen = computed(() => {
    const screens = ['dk', 'lp', 'tb', 'mb', 'ms'] as const

    return screens.find((key) => screen[key]) ?? 'unknown'
  })
  const { theme } = useTheme()
  const product = await $di.product.productOne({
    effect() {
      console.log('Effect productOne')
    },
    server: true,
  })
  onMounted(async () => {
    await screen.ready
    screenReady.value = true
  })
</script>

<template>
  <main class="mx-auto max-w-3xl space-y-10 p-6">
    <section class="space-y-4 text-alt-400 hover:bg-alt-950">
      <p class="text-sm font-medium text-gray-500">{{ product.data }}</p>
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

    <ClientOnly>{{ theme }}</ClientOnly>
    <section class="space-y-4">
      <p class="text-sm font-medium text-gray-500">useScreen</p>
      <p class="text-sm text-gray-300">
        <template v-if="screenReady">
          {{ t('Active range') }}: {{ t('Active range2') }}:
          <strong>{{ activeScreen }}</strong>
        </template>
        <template v-else>Detecting screen size…</template>
      </p>
      <div class="grid gap-2 rounded-lg bg-gray-100 p-3 text-sm font-medium text-gray-700">
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
  </main>
</template>
