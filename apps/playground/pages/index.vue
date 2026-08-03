<script lang="ts" setup>
  const screen = useScreen()
  const clicks = ref(0)
  const screenReady = ref(false)

  const activeScreen = computed(() => {
    const screens = ['base', 'sm', 'md', 'lg', 'xl', 'xxl'] as const

    return screens.find((key) => screen[key]) ?? 'unknown'
  })
  const { theme } = useTheme()

  onMounted(async () => {
    await screen.ready
    screenReady.value = true
  })
</script>

<template>
  <main class="mx-auto max-w-3xl space-y-10 p-6 sm:p-10">
    <section class="space-y-4 text-alt-400 hover:bg-alt-950">
      <p class="text-sm font-medium text-gray-500">BrickButton</p>
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
          aria-label="Delete"
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
          Active range:
          <strong>{{ activeScreen }}</strong>
        </template>
        <template v-else>Detecting screen size…</template>
      </p>
      <div class="grid gap-2 rounded-lg bg-gray-100 p-3 text-sm font-medium text-gray-700">
        <p :class="screen.baseClass">base: under 40rem</p>
        <p :class="screen.smClass">sm: 40rem–48rem</p>
        <p :class="screen.mdClass">md: 48rem–64rem</p>
        <p :class="screen.lgClass">lg: 64rem–80rem</p>
        <p :class="screen.xlClass">xl: 80rem–96rem</p>
        <p :class="screen.xxlClass">xxl: 96rem and up</p>
      </div>
    </section>
  </main>
</template>
