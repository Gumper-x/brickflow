<script lang="ts">
  export const uiDemo = {
    description: 'Browse every icon available in the project, filter by name, and click to copy its name.',
    title: 'Icon gallery',
  }
</script>

<script lang="ts" setup>
  import { computed, onBeforeUnmount, ref } from 'vue'

  import { iconNames } from '#brickflow-ui-icons'

  import Icon from './index.vue'

  const search = ref('')
  const copiedIconName = ref('')
  const copyError = ref('')
  let copiedTimeout: ReturnType<typeof setTimeout> | undefined

  const filteredIconNames = computed(() => {
    const query = search.value.trim().toLocaleLowerCase()

    return query ? iconNames.filter((name) => name.toLocaleLowerCase().includes(query)) : iconNames
  })

  const copyIconName = async (name: string): Promise<void> => {
    copyError.value = ''

    try {
      await navigator.clipboard.writeText(name)
      clearTimeout(copiedTimeout)
      copiedIconName.value = name
      copiedTimeout = setTimeout(() => {
        copiedIconName.value = ''
      }, 2000)
    } catch {
      copyError.value = 'Could not copy the icon name. Please try again.'
    }
  }

  onBeforeUnmount(() => clearTimeout(copiedTimeout))
</script>

<template>
  <div class="space-y-5 text-zinc-100">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <label class="relative block w-full max-w-md">
        <span class="sr-only">Search icons</span>
        <svg
          class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <circle
            cx="11"
            cy="11"
            r="8"
          />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          v-model="search"
          class="w-full max-w-60 rounded-lg border border-zinc-700 bg-zinc-950 py-2 pr-3 pl-9 text-sm text-zinc-200 caret-blue-400 outline-none placeholder:text-zinc-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
          placeholder="Search icon"
          type="search"
        />
      </label>

      <p
        class="text-sm text-zinc-400"
        aria-live="polite"
      >
        {{ filteredIconNames.length }} of {{ iconNames.length }} icons
      </p>
    </div>

    <p
      class="sr-only"
      role="status"
    >
      {{ copiedIconName ? `Copied ${copiedIconName}` : '' }}
    </p>
    <p
      v-if="copyError"
      class="text-sm text-red-400"
      role="alert"
    >
      {{ copyError }}
    </p>

    <ul
      v-if="filteredIconNames.length"
      class="grid grid-cols-6 gap-3 lp:grid-cols-5 tb:grid-cols-4 mb:grid-cols-3 ms:grid-cols-2"
    >
      <li
        v-for="name in filteredIconNames"
        :key="name"
        class="min-w-0"
      >
        <button
          type="button"
          :aria-label="`Copy ${name}`"
          :class="[
            'group flex w-full cursor-pointer flex-col items-center gap-3 rounded-xl border px-3 py-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400',
            copiedIconName === name
              ? 'border-green-500/50 bg-green-500/10'
              : 'border-zinc-900 bg-zinc-950/50 hover:border-zinc-700 hover:bg-zinc-900/70',
          ]"
          :title="`Copy ${name}`"
          @click="copyIconName(name)"
        >
          <Icon
            :name="name"
            aria-hidden="true"
            class="text-3xl text-zinc-100"
          />
          <span
            :class="[
              'w-full truncate text-center font-mono text-xs transition-colors',
              copiedIconName === name ? 'text-green-400' : 'text-zinc-400 group-hover:text-zinc-100',
            ]"
          >
            {{ copiedIconName === name ? 'Copied' : name }}
          </span>
        </button>
      </li>
    </ul>

    <div
      v-else
      class="rounded-xl border border-dashed border-zinc-700 px-6 py-12 text-center"
    >
      <p class="text-sm font-medium text-zinc-200">No icons found</p>
      <p class="mt-1 text-sm text-zinc-500">Try another name.</p>
    </div>
  </div>
</template>
