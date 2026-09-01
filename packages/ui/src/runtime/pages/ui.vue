<script lang="ts" setup>
  import { useHead, useRoute, useRouter } from 'nuxt/app'
  import { computed, nextTick, onMounted, ref, watch } from 'vue'

  import { uiComponents } from '#brickflow-ui-catalog'
  import { uiThemeEnabled } from '#brickflow-ui-options'

  import { useTheme } from '../composables/useTheme'

  useHead({
    meta: [
      {
        content: 'noindex, nofollow, noarchive',
        name: 'robots',
      },
    ],
    title: 'UI playground',
  })

  const route = useRoute()
  const router = useRouter()
  const expandedDemoCode = ref(new Set<string>())
  const isNavigationOpen = ref(false)
  const mobileNavigation = ref<HTMLElement>()
  const colorSwatchesReady = ref(false)
  const stylesExpanded = ref(false)
  const theme = uiThemeEnabled ? useTheme() : undefined
  const isDark = computed(() => theme?.isDark.value ?? false)
  const toggleTheme = (): void => theme?.toggleTheme()

  const activeComponent = computed(() => {
    const component = route.query.component
    const id = typeof component === 'string' ? component : undefined

    return uiComponents.find((item) => item.id === id) ?? uiComponents[0]
  })

  const visibleStyles = computed(() => {
    const styles = activeComponent.value?.styles ?? []

    return stylesExpanded.value ? styles : styles.slice(0, 5)
  })

  const getDemoCodeKey = (demoId: string): string => `${activeComponent.value?.id}:${demoId}`

  const escapeHtml = (value: string): string =>
    value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          '"': '&quot;',
          '&': '&amp;',
          "'": '&#39;',
          '<': '&lt;',
          '>': '&gt;',
        })[character] ?? character,
    )

  const token = (className: string, value: string): string => `<span class="${className}">${value}</span>`

  const highlightTypeScript = (source: string): string => {
    const pattern =
      /\/\*[\s\S]*?\*\/|\/\/[^\n]*|`(?:\\[\s\S]|[^`])*`|'(?:\\[\s\S]|[^'])*'|"(?:\\[\s\S]|[^"])*"|\b(?:as|async|await|const|export|from|function|import|interface|let|return|type)\b|\b\d+(?:\.\d+)?\b/g
    let html = ''
    let lastIndex = 0

    for (const match of source.matchAll(pattern)) {
      const index = match.index ?? 0
      const value = match[0]
      html += escapeHtml(source.slice(lastIndex, index))

      if (value.startsWith('//') || value.startsWith('/*')) {
        html += token('ui-code-comment', escapeHtml(value))
      } else if (value.startsWith("'") || value.startsWith('"') || value.startsWith('`')) {
        html += token('ui-code-string', escapeHtml(value))
      } else if (/^\d/.test(value)) {
        html += token('ui-code-number', value)
      } else {
        html += token('ui-code-keyword', value)
      }

      lastIndex = index + value.length
    }

    return html + escapeHtml(source.slice(lastIndex))
  }

  const highlightPropType = (source: string): string => {
    const pattern =
      /`(?:\\[\s\S]|[^`])*`|'(?:\\[\s\S]|[^'])*'|"(?:\\[\s\S]|[^"])*"|\b(?:any|bigint|boolean|never|null|number|object|string|symbol|undefined|unknown|void)\b|\b[A-Z]\w*\b|\|/g
    let html = ''
    let lastIndex = 0

    for (const match of source.matchAll(pattern)) {
      const index = match.index ?? 0
      const value = match[0]
      html += escapeHtml(source.slice(lastIndex, index))

      if (value.startsWith("'") || value.startsWith('"') || value.startsWith('`')) {
        html += token('ui-code-string', escapeHtml(value))
      } else if (value === '|') {
        html += token('ui-code-punctuation', value)
      } else if (/^[A-Z]/.test(value)) {
        html += token('ui-code-tag', escapeHtml(value))
      } else {
        html += token('ui-code-keyword', value)
      }

      lastIndex = index + value.length
    }

    return html + escapeHtml(source.slice(lastIndex))
  }

  const highlightTag = (source: string): string => {
    const opening = source.match(/^<(\/)?([\w.-]+)/)
    const closing = source.match(/\/?>\s*$/)

    if (!opening || !closing) {
      return escapeHtml(source)
    }

    const attributes = source.slice(opening[0].length, source.length - closing[0].length)
    let html = token('ui-code-punctuation', '&lt;')
    let attributeIndex = 0

    if (opening[1]) {
      html += token('ui-code-punctuation', '/')
    }

    html += token('ui-code-tag', escapeHtml(opening[2] ?? ''))

    while (attributeIndex < attributes.length) {
      const character = attributes[attributeIndex] ?? ''
      if (/\s/.test(character)) {
        html += escapeHtml(character)
        attributeIndex += 1
        continue
      }

      const nameStart = attributeIndex
      while (attributeIndex < attributes.length && !/[\s=]/.test(attributes[attributeIndex] ?? '')) {
        attributeIndex += 1
      }

      const name = attributes.slice(nameStart, attributeIndex)
      html += token('ui-code-attribute', escapeHtml(name))

      const whitespaceStart = attributeIndex
      while (/\s/.test(attributes[attributeIndex] ?? '')) {
        attributeIndex += 1
      }
      html += escapeHtml(attributes.slice(whitespaceStart, attributeIndex))

      if (attributes[attributeIndex] !== '=') {
        continue
      }

      html += token('ui-code-punctuation', '=')
      attributeIndex += 1

      const valueWhitespaceStart = attributeIndex
      while (/\s/.test(attributes[attributeIndex] ?? '')) {
        attributeIndex += 1
      }
      html += escapeHtml(attributes.slice(valueWhitespaceStart, attributeIndex))

      const quote = attributes[attributeIndex]
      const valueStart = attributeIndex
      if (quote === '"' || quote === "'") {
        attributeIndex += 1
        while (attributeIndex < attributes.length && attributes[attributeIndex] !== quote) {
          attributeIndex += attributes[attributeIndex] === '\\' ? 2 : 1
        }
        attributeIndex += 1
      } else {
        while (attributeIndex < attributes.length && !/\s/.test(attributes[attributeIndex] ?? '')) {
          attributeIndex += 1
        }
      }

      html += token('ui-code-string', escapeHtml(attributes.slice(valueStart, attributeIndex)))
    }

    html += token('ui-code-punctuation', escapeHtml(closing[0]))

    return html
  }

  const highlightTemplate = (source: string): string => {
    let html = ''
    let index = 0

    while (index < source.length) {
      const commentStart = source.indexOf('<!--', index)
      const interpolationStart = source.indexOf('{{', index)
      const tagStart = source.indexOf('<', index)
      const starts = [commentStart, interpolationStart, tagStart].filter((start) => start !== -1)
      const start = Math.min(...starts)

      if (!Number.isFinite(start)) {
        return html + escapeHtml(source.slice(index))
      }

      html += escapeHtml(source.slice(index, start))

      if (start === commentStart) {
        const end = source.indexOf('-->', start + 4)
        if (end === -1) {
          return html + token('ui-code-comment', escapeHtml(source.slice(start)))
        }

        html += token('ui-code-comment', escapeHtml(source.slice(start, end + 3)))
        index = end + 3
      } else if (start === interpolationStart) {
        const end = source.indexOf('}}', start + 2)
        if (end === -1) {
          return html + escapeHtml(source.slice(start))
        }

        html += token('ui-code-punctuation', '{{')
        html += highlightTypeScript(source.slice(start + 2, end))
        html += token('ui-code-punctuation', '}}')
        index = end + 2
      } else {
        let tagEnd = start + 1
        let quote = ''

        while (tagEnd < source.length) {
          const character = source[tagEnd] ?? ''
          if (quote) {
            if (character === '\\') {
              tagEnd += 2
              continue
            }

            if (character === quote) {
              quote = ''
            }
          } else if (character === '"' || character === "'") {
            quote = character
          } else if (character === '>') {
            break
          }

          tagEnd += 1
        }

        const tag = source.slice(start, tagEnd + 1)
        if (/^<\/?[\w.-]/.test(tag)) {
          html += highlightTag(tag)
        } else {
          html += escapeHtml(tag)
        }
        index = tagEnd + 1
      }
    }

    return html
  }

  const highlightDemoCode = (source: string): string => {
    const scriptPattern = /(<script\b[^>]*>)([\s\S]*?)(<\/script>)/g
    let html = ''
    let lastIndex = 0

    for (const match of source.matchAll(scriptPattern)) {
      const index = match.index ?? 0
      html += highlightTemplate(source.slice(lastIndex, index))
      html += highlightTag(match[1] ?? '')
      html += highlightTypeScript(match[2] ?? '')
      html += highlightTag(match[3] ?? '')
      lastIndex = index + match[0].length
    }

    return html + highlightTemplate(source.slice(lastIndex))
  }

  const highlightTailwindValue = (value: string): string => {
    const pattern = /\d+(?:\.\d+)?/g
    let html = ''
    let lastIndex = 0

    for (const match of value.matchAll(pattern)) {
      const index = match.index ?? 0
      html += token('ui-code-string', escapeHtml(value.slice(lastIndex, index)))
      html += token('ui-code-number', match[0])
      lastIndex = index + match[0].length
    }

    return html + token('ui-code-string', escapeHtml(value.slice(lastIndex)))
  }

  const getTailwindColorSwatch = (utility: string): string => {
    const match = utility.match(
      /^(?:accent|bg|border|caret|decoration|divide|fill|from|outline|ring|shadow|stroke|text|to|via)-([a-z][a-z0-9-]*)(?:\/(\d{1,3}))?$/,
    )

    if (!colorSwatchesReady.value || !match || typeof window === 'undefined') {
      return ''
    }

    const [, name, opacity] = match
    const colorVariable = `--color-${name}`
    const color = getComputedStyle(document.body).getPropertyValue(colorVariable).trim()

    if (!color || !CSS.supports('color', color)) {
      return ''
    }

    const opacityValue = opacity && Number(opacity) <= 100 ? Number(opacity) : undefined
    const background = opacityValue
      ? `color-mix(in srgb, var(${colorVariable}) ${opacityValue}%, transparent)`
      : `var(${colorVariable})`

    return `<span aria-hidden="true" class="ui-color-swatch" style="--ui-color-swatch: ${background}"></span>`
  }

  const highlightTailwindUtility = (utility: string): string => {
    let source = utility
    let html = ''

    for (const prefix of ['!', '-']) {
      if (source.startsWith(prefix)) {
        html += token('ui-code-punctuation', prefix)
        source = source.slice(prefix.length)
      }
    }

    html += getTailwindColorSwatch(source)

    const separatorIndex = source.indexOf('-')
    if (separatorIndex === -1) {
      return html + token('ui-code-attribute', escapeHtml(source))
    }

    html += token('ui-code-attribute', escapeHtml(source.slice(0, separatorIndex)))
    html += token('ui-code-punctuation', '-')

    return html + highlightTailwindValue(source.slice(separatorIndex + 1))
  }

  const highlightTailwindClass = (className: string): string => {
    const segments: string[] = []
    let start = 0
    let bracketDepth = 0

    for (let index = 0; index < className.length; index += 1) {
      const character = className[index]

      if (character === '[') {
        bracketDepth += 1
      } else if (character === ']') {
        bracketDepth = Math.max(0, bracketDepth - 1)
      } else if (character === ':' && bracketDepth === 0) {
        segments.push(className.slice(start, index))
        start = index + 1
      }
    }

    const utility = className.slice(start)
    const variants = segments.map(
      (segment) => `${token('ui-code-keyword', escapeHtml(segment))}${token('ui-code-punctuation', ':')}`,
    )

    return variants.join('') + highlightTailwindUtility(utility)
  }

  const highlightStyleValue = (value: string | undefined): string => {
    if (value === undefined) {
      return token('ui-code-comment', '—')
    }

    if (value === '') {
      return token('ui-code-string', '&quot;&quot;')
    }

    return value
      .split(/(\s+)/)
      .map((part) => (/\s/.test(part) ? escapeHtml(part) : highlightTailwindClass(part)))
      .join('')
  }

  const isDemoCodeExpanded = (demoId: string): boolean => expandedDemoCode.value.has(getDemoCodeKey(demoId))

  const toggleDemoCode = (demoId: string): void => {
    const key = getDemoCodeKey(demoId)
    const next = new Set(expandedDemoCode.value)

    next.has(key) ? next.delete(key) : next.add(key)
    expandedDemoCode.value = next
  }

  const closeNavigation = (): void => {
    isNavigationOpen.value = false
  }

  onMounted(() => {
    colorSwatchesReady.value = true
  })

  watch(isNavigationOpen, async (isOpen) => {
    if (isOpen) {
      await nextTick()
      mobileNavigation.value?.focus()
    }
  })

  watch(
    () => route.query.component,
    (component) => {
      closeNavigation()
      window.scrollTo({ behavior: 'smooth', top: 0 })
      if (typeof component === 'string' && uiComponents.some((item) => item.id === component)) {
        return
      }

      const firstComponent = uiComponents[0]
      if (!firstComponent) {
        return
      }

      router.replace({
        path: '/ui',
        query: {
          ...route.query,
          component: firstComponent.id,
        },
      })
    },
    { immediate: true },
  )

  watch(
    () => activeComponent.value?.id,
    () => {
      stylesExpanded.value = false
    },
  )
</script>

<template>
  <main class="min-h-screen bg-zinc-950 text-zinc-100">
    <header
      class="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur dk:hidden"
    >
      <div class="min-w-0">
        <p class="text-xs font-medium tracking-widest text-zinc-500 uppercase">Components</p>
        <p class="truncate text-sm font-medium text-zinc-100">{{ activeComponent?.name }}</p>
      </div>
      <button
        type="button"
        class="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-zinc-700 text-zinc-200 transition hover:border-blue-700 hover:bg-blue-900 hover:text-blue-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
        aria-controls="ui-mobile-navigation"
        :aria-expanded="isNavigationOpen"
        aria-label="Open components menu"
        @click="isNavigationOpen = true"
      >
        <svg
          class="size-5"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
    </header>

    <div
      v-if="isNavigationOpen"
      class="fixed inset-0 z-40 dk:hidden"
      @keydown.esc="closeNavigation"
    >
      <button
        class="absolute inset-0 cursor-default bg-black/60"
        aria-label="Close components menu"
        type="button"
        @click="closeNavigation"
      />
      <aside
        id="ui-mobile-navigation"
        ref="mobileNavigation"
        class="relative flex h-full flex-col border-r border-zinc-800 bg-zinc-950 p-4 shadow-2xl"
        :class="$style.mobileNavigation"
        aria-label="UI components"
        tabindex="-1"
      >
        <div class="flex items-center justify-between gap-4 px-2 py-1">
          <p class="text-xs font-medium tracking-widest text-zinc-500 uppercase">Components</p>
          <button
            type="button"
            class="flex size-8 cursor-pointer items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-900 hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
            aria-label="Close components menu"
            @click="closeNavigation"
          >
            <svg
              class="size-5"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <nav
          class="mt-3 space-y-1 overflow-y-auto"
          aria-label="UI components"
        >
          <NuxtLink
            v-for="component in uiComponents"
            :key="component.id"
            :aria-current="activeComponent?.id === component.id ? 'page' : undefined"
            :class="[
              'block rounded-lg px-3 py-2.5 text-sm transition',
              activeComponent?.id === component.id
                ? 'bg-blue-900 text-blue-100'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100',
            ]"
            :to="{
              path: '/ui',
              query: {
                ...route.query,
                component: component.id,
              },
            }"
            @click="closeNavigation"
          >
            {{ component.name }}
          </NuxtLink>
        </nav>
      </aside>
    </div>

    <div class="mx-auto flex min-h-screen max-w-7xl">
      <aside class="hidden w-64 shrink-0 border-r border-zinc-800 px-4 py-6 dk:block">
        <p class="px-3 text-xs font-medium tracking-widest text-zinc-500 uppercase">Components</p>

        <nav
          class="sticky top-2 mt-4 space-y-1"
          aria-label="UI components"
        >
          <NuxtLink
            v-for="component in uiComponents"
            :key="component.id"
            :aria-current="activeComponent?.id === component.id ? 'page' : undefined"
            :class="[
              'block rounded-lg px-3 py-2 text-sm transition',
              activeComponent?.id === component.id
                ? 'bg-blue-900 text-blue-100'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100',
            ]"
            :to="{
              path: '/ui',
              query: {
                ...route.query,
                component: component.id,
              },
            }"
          >
            {{ component.name }}
          </NuxtLink>
        </nav>
      </aside>

      <section class="min-w-0 flex-1 px-10 py-6 lp:px-6 mb:px-4">
        <template v-if="activeComponent">
          <div class="flex items-center gap-3">
            <h1 class="text-3xl leading-tight font-semibold mb:text-2xl">{{ activeComponent.name }}</h1>
            <button
              v-if="uiThemeEnabled"
              type="button"
              class="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-zinc-700 text-zinc-400 transition hover:border-blue-700 hover:bg-blue-900 hover:text-blue-200 focus-visible:outline-2 focus-visible:outline-offset-2"
              :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
              :title="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
              @click="toggleTheme"
            >
              <svg
                v-if="isDark"
                class="size-3"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="4"
                />
                <path
                  d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                />
              </svg>
              <svg
                v-else
                class="size-3"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                viewBox="0 0 24 24"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
              </svg>
            </button>
          </div>
          <section
            v-for="demo in activeComponent.demos"
            :key="demo.title"
            class="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 first:mt-8"
          >
            <header
              class="flex items-start justify-between gap-4 border-b border-zinc-800 bg-zinc-900 px-8 py-4 mb:gap-3 mb:px-4 mb:py-3"
            >
              <div>
                <h2 class="text-base font-medium text-zinc-100">{{ demo.title }}</h2>
                <p
                  v-if="demo.description"
                  class="mt-1 text-sm text-zinc-400"
                >
                  {{ demo.description }}
                </p>
              </div>
              <button
                type="button"
                :aria-label="isDemoCodeExpanded(demo.id) ? 'Hide code' : 'View code'"
                :class="[
                  'flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md border transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400',
                  isDemoCodeExpanded(demo.id)
                    ? 'border-blue-700 bg-blue-900 text-blue-200'
                    : 'border-zinc-700 text-zinc-400 hover:border-blue-700 hover:text-blue-200',
                ]"
                :title="isDemoCodeExpanded(demo.id) ? 'Hide code' : 'View code'"
                @click="toggleDemoCode(demo.id)"
              >
                <svg
                  class="size-4"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  viewBox="0 0 24 24"
                >
                  <path d="m8 9-3 3 3 3" />
                  <path d="m16 9 3 3-3 3" />
                  <path d="m14 5-4 14" />
                </svg>
              </button>
            </header>
            <div class="p-8 mb:p-4">
              <component :is="demo.component" />
            </div>
            <div
              v-if="isDemoCodeExpanded(demo.id)"
              class="border-t border-zinc-800 bg-zinc-950/80 p-8 mb:p-4"
            >
              <pre
                class="overflow-x-auto text-sm leading-6 text-zinc-300"
              ><code v-html="highlightDemoCode(demo.code.trim())" /></pre>
            </div>
          </section>
          <p
            v-if="activeComponent.demos.length === 0"
            class="mt-8 text-zinc-400"
          >
            Add a
            <code class="text-zinc-200">*.demo.vue</code>
            file to this component folder.
          </p>
          <section class="mt-8 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50">
            <header class="border-b border-zinc-800 bg-zinc-900 px-8 py-4 mb:px-4 mb:py-3">
              <h2 class="text-base font-medium text-zinc-100">Component API</h2>
            </header>

            <div
              class="grid grid-cols-2 divide-x divide-y-0 divide-zinc-800 tb:grid-cols-1 tb:divide-x-0 tb:divide-y"
            >
              <section class="px-6 py-5 mb:px-4">
                <h3 class="text-sm font-medium text-zinc-200">Props</h3>
                <div class="mt-4 overflow-x-auto">
                  <table class="w-full min-w-96 text-left text-sm mb:min-w-80">
                    <!-- <thead class="text-xs tracking-wider text-zinc-500 uppercase">
                      <tr>
                        <th class="pb-3 font-medium">Name</th>
                        <th class="pb-3 font-medium">Type</th>
                        <th class="pb-3 text-right font-medium">Required</th>
                      </tr>
                    </thead> -->
                    <tbody class="divide-y divide-zinc-800 text-zinc-300">
                      <tr
                        v-for="prop in activeComponent.props"
                        :key="prop.name"
                      >
                        <td class="py-3 pr-4 font-mono text-zinc-400">{{ prop.name }}</td>
                        <td
                          class="py-3 pr-4 font-mono text-xs break-all"
                          v-html="highlightPropType(prop.type)"
                        />
                        <td
                          class="py-3 text-right text-xs"
                          :class="prop.required ? 'text-red-600' : 'text-zinc-500'"
                        >
                          {{ prop.required ? '*' : '-' }}
                        </td>
                      </tr>
                      <tr v-if="activeComponent.props.length === 0">
                        <td
                          colspan="3"
                          class="py-3 text-zinc-500"
                        >
                          No props declared.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section class="px-6 py-5 mb:px-4">
                <h3 class="text-sm font-medium text-zinc-200">Slots</h3>
                <div
                  v-if="activeComponent.slots.length"
                  class="mt-4 flex flex-wrap gap-2"
                >
                  <code
                    v-for="slot in activeComponent.slots"
                    :key="slot"
                    class="rounded-md border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs"
                    :class="slot === 'default' ? 'text-zinc-500' : 'text-zinc-400'"
                  >
                    {{ slot }}
                  </code>
                </div>
                <p
                  v-else
                  class="mt-4 text-sm text-zinc-500"
                >
                  No slots detected.
                </p>
              </section>
            </div>
          </section>

          <section
            v-if="activeComponent.styles.length"
            class="mt-6 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50"
          >
            <header
              class="flex items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-900 px-8 py-4 mb:gap-3 mb:px-4 mb:py-3"
            >
              <div class="flex items-center gap-3">
                <div>
                  <h2 class="text-base font-medium text-zinc-100">UI styles</h2>
                </div>
              </div>
              <span class="rounded-full border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400">
                {{ activeComponent.styles.length }} fields
              </span>
            </header>

            <div class="px-8 py-2 mb:px-4">
              <div class="divide-y divide-zinc-800">
                <div
                  v-for="style in visibleStyles"
                  :key="style.path"
                  class="grid gap-6 py-4 mb:gap-2"
                  :class="$style.styleGrid"
                >
                  <code class="font-mono text-xs text-blue-300">{{ style.path }}</code>
                  <code
                    class="font-mono text-xs wrap-break-word text-zinc-300"
                    :class="$style.styleValue"
                    v-html="highlightStyleValue(style.value)"
                  />
                </div>
              </div>
            </div>

            <footer
              v-if="activeComponent.styles.length > 5"
              class="sticky bottom-0 z-10 border-t border-zinc-800 bg-zinc-900/95 px-8 py-3 backdrop-blur mb:px-4"
            >
              <button
                type="button"
                class="flex w-full cursor-pointer items-center justify-center text-sm font-medium text-cyan-500 transition hover:text-cyan-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
                @click="stylesExpanded = !stylesExpanded"
              >
                {{ stylesExpanded ? 'Collapse styles' : `Show all ${activeComponent.styles.length} styles` }}
              </button>
            </footer>
          </section>
        </template>

        <p
          v-else
          class="text-zinc-400"
        >
          Add
          <code class="text-zinc-200">Component/index.vue</code>
          and a
          <code class="text-zinc-200">*.demo.vue</code>
          file to show it here.
        </p>
      </section>
    </div>
  </main>
</template>

<style src="../ui-page.css"></style>

<style module>
  :global(.ui-code-comment) {
    color: var(--color-zinc-500);
  }

  :global(.ui-code-string) {
    color: var(--color-emerald-400);
  }

  :global(.ui-code-keyword) {
    color: var(--color-blue-400);
  }

  :global(.ui-code-number) {
    color: var(--color-amber-300);
  }

  :global(.ui-code-tag) {
    color: var(--color-cyan-500);
  }

  :global(.ui-code-attribute) {
    color: var(--color-violet-300);
  }

  :global(.ui-code-punctuation) {
    color: var(--color-zinc-400);
  }

  :global(.ui-color-swatch) {
    display: inline-block;
    width: 0.65rem;
    height: 0.65rem;
    margin-right: 0.25rem;
    vertical-align: -0.1rem;
    border: 1px solid rgb(255 255 255 / 10%);
    border-radius: 0.2rem;
    background: var(--ui-color-swatch);
    opacity: 0.85;
    /* box-shadow: inset 0 0 0 1px rgb(0 0 0 / 10%); */
  }

  .mobileNavigation {
    width: min(18rem, calc(100vw - 3rem));
  }

  @media (width >= 40rem) {
    .styleGrid {
      grid-template-columns: minmax(12rem, 0.8fr) minmax(0, 1.8fr);
    }
  }

  .styleValue :global(.ui-code-keyword) {
    color: var(--color-zinc-500);
  }

  .styleValue :global(.ui-code-attribute) {
    color: var(--color-zinc-200);
  }

  .styleValue :global(.ui-code-string) {
    color: var(--color-zinc-300);
  }

  .styleValue :global(.ui-code-number) {
    color: var(--color-zinc-400);
  }

  .styleValue :global(.ui-code-punctuation) {
    color: var(--color-zinc-500);
  }
</style>
