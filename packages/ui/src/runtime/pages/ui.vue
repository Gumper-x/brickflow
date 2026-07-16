<script lang="ts" setup>
  import { computed, ref, watch } from 'vue'

  import { uiComponents } from '#brickflow-ui-catalog'

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
  const stylesExpanded = ref(false)

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
    const themeColor = utility.match(
      /(?:^|-)(alt|danger|info|main|plain|warn|win)-(50|100|200|300|400|500|600|700|800|900|950)(?:\/(\d{1,3}))?(?:$|-)/,
    )
    const neutralColor = utility.match(/(?:^|-)(black|white)(?:\/(\d{1,3}))?$/)
    const match = themeColor ?? neutralColor

    if (!match) {
      return ''
    }

    const [, name, shade, opacity] = match
    const color = shade ? `var(--color-${name}-${shade})` : `var(--color-${name})`
    const background = opacity ? `color-mix(in srgb, ${color} ${opacity}%, transparent)` : color

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

  watch(
    () => route.query.component,
    (component) => {
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
  <main class="min-h-screen bg-plain-950 text-plain-50">
    <div class="mx-auto flex min-h-screen max-w-7xl">
      <aside class="w-64 shrink-0 border-r border-plain-800 px-4 py-6">
        <p class="px-3 text-xs font-medium tracking-widest text-plain-500 uppercase">Components</p>

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
                ? 'bg-main-900 text-main-100'
                : 'text-plain-400 hover:bg-plain-900 hover:text-plain-100',
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

      <section class="min-w-0 flex-1 px-6 py-6 sm:px-10">
        <template v-if="activeComponent">
          <h1 class="text-3xl font-semibold">{{ activeComponent.name }}</h1>
          <section
            v-for="demo in activeComponent.demos"
            :key="demo.title"
            class="mt-6 overflow-hidden rounded-2xl border border-plain-800 bg-plain-900/50 first:mt-8"
          >
            <header
              class="flex items-start justify-between gap-4 border-b border-plain-800 bg-plain-900 px-6 py-4 sm:px-8"
            >
              <div>
                <h2 class="text-base font-medium text-plain-100">{{ demo.title }}</h2>
                <p
                  v-if="demo.description"
                  class="mt-1 text-sm text-plain-400"
                >
                  {{ demo.description }}
                </p>
              </div>
              <button
                type="button"
                :aria-label="isDemoCodeExpanded(demo.id) ? 'Hide code' : 'View code'"
                :class="[
                  'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-main-400',
                  isDemoCodeExpanded(demo.id)
                    ? 'border-main-700 bg-main-900 text-main-200'
                    : 'border-plain-700 text-plain-400 hover:border-main-700 hover:bg-main-900 hover:text-main-200',
                ]"
                :title="isDemoCodeExpanded(demo.id) ? 'Hide code' : 'View code'"
                @click="toggleDemoCode(demo.id)"
              >
                <svg
                  class="size-5"
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
            <div class="p-6 sm:p-8">
              <component :is="demo.component" />
            </div>
            <div
              v-if="isDemoCodeExpanded(demo.id)"
              class="border-t border-plain-800 bg-plain-950/80 p-6 sm:p-8"
            >
              <pre
                class="overflow-x-auto text-sm leading-6 text-plain-300"
              ><code v-html="highlightDemoCode(demo.code)" /></pre>
            </div>
          </section>
          <p
            v-if="activeComponent.demos.length === 0"
            class="mt-8 text-plain-400"
          >
            Add a
            <code class="text-plain-200">*.demo.vue</code>
            file to this component folder.
          </p>
          <section class="mt-8 overflow-hidden rounded-2xl border border-plain-800 bg-plain-900/50">
            <header class="border-b border-plain-800 bg-plain-900 px-6 py-4 sm:px-8">
              <h2 class="text-base font-medium text-plain-100">Component API</h2>
            </header>

            <div class="grid divide-y divide-plain-800 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              <section class="py-5 px-6">
                <h3 class="text-sm font-medium text-plain-200">Props</h3>
                <div class="mt-4 overflow-x-auto">
                  <table class="w-full min-w-96 text-left text-sm">
                    <thead class="text-xs tracking-wider text-plain-500 uppercase">
                      <tr>
                        <th class="pb-3 font-medium">Name</th>
                        <th class="pb-3 font-medium">Type</th>
                        <th class="pb-3 text-right font-medium">Required</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-plain-800 text-plain-300">
                      <tr
                        v-for="prop in activeComponent.props"
                        :key="prop.name"
                      >
                        <td class="py-3 pr-4 font-mono text-main-300">{{ prop.name }}</td>
                        <td
                          class="py-3 pr-4 font-mono text-xs break-all"
                          v-html="highlightPropType(prop.type)"
                        />
                        <td class="py-3 text-right text-xs">
                          {{ prop.required ? 'yes' : 'no' }}
                        </td>
                      </tr>
                      <tr v-if="activeComponent.props.length === 0">
                        <td
                          colspan="3"
                          class="py-3 text-plain-500"
                        >
                          No props declared.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section class="py-5 px-6">
                <h3 class="text-sm font-medium text-plain-200">Slots</h3>
                <div
                  v-if="activeComponent.slots.length"
                  class="mt-4 flex flex-wrap gap-2"
                >
                  <code
                    v-for="slot in activeComponent.slots"
                    :key="slot"
                    class="rounded-md border border-plain-700 bg-plain-950 px-2.5 py-1.5 text-xs text-main-300"
                  >
                    {{ slot }}
                  </code>
                </div>
                <p
                  v-else
                  class="mt-4 text-sm text-plain-500"
                >
                  No slots detected.
                </p>
              </section>
            </div>
          </section>

          <section
            v-if="activeComponent.styles.length"
            class="mt-6 overflow-hidden rounded-2xl border border-plain-800 bg-plain-900/50"
          >
            <header
              class="flex items-center justify-between gap-4 border-b border-plain-800 bg-plain-900 px-6 py-4 sm:px-8"
            >
              <div class="flex items-center gap-3">
                <div>
                  <h2 class="text-base font-medium text-plain-100">UI styles</h2>
                </div>
              </div>
              <span class="rounded-full border border-plain-700 px-2.5 py-1 text-xs text-plain-400">
                {{ activeComponent.styles.length }} fields
              </span>
            </header>

            <div class="px-6 py-2 sm:px-8">
              <div class="divide-y divide-plain-800">
                <div
                  v-for="style in visibleStyles"
                  :key="style.path"
                  class="grid gap-2 py-4 sm:grid-cols-[minmax(12rem,0.8fr)_minmax(0,1.8fr)] sm:gap-6"
                >
                  <code class="font-mono text-xs text-main-300">{{ style.path }}</code>
                  <code
                    class="ui-style-value font-mono text-xs text-plain-300 break-word"
                    v-html="highlightStyleValue(style.value)"
                  />
                </div>
              </div>
            </div>

            <footer
              v-if="activeComponent.styles.length > 5"
              class="sticky bottom-0 z-10 border-t border-plain-800 bg-plain-900/95 px-6 py-3 backdrop-blur sm:px-8"
            >
              <button
                type="button"
                class="flex w-full cursor-pointer items-center justify-center text-sm font-medium text-info-500 transition hover:text-info-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-info-400"
                @click="stylesExpanded = !stylesExpanded"
              >
                {{ stylesExpanded ? 'Collapse styles' : `Show all ${activeComponent.styles.length} styles` }}
              </button>
            </footer>
          </section>
        </template>

        <p
          v-else
          class="text-plain-400"
        >
          Add
          <code class="text-plain-200">Component/index.vue</code>
          and a
          <code class="text-plain-200">*.demo.vue</code>
          file to show it here.
        </p>
      </section>
    </div>
  </main>
</template>

<style>
  .ui-code-comment {
    color: var(--color-plain-500);
  }

  .ui-code-string {
    color: var(--color-win-300);
  }

  .ui-code-keyword {
    color: var(--color-main-300);
  }

  .ui-code-number {
    color: var(--color-warn-300);
  }

  .ui-code-tag {
    color: var(--color-info-300);
  }

  .ui-code-attribute {
    color: var(--color-alt-300);
  }

  .ui-code-punctuation {
    color: var(--color-plain-400);
  }

  .ui-color-swatch {
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

  .ui-style-value .ui-code-keyword {
    color: var(--color-plain-500);
  }

  .ui-style-value .ui-code-attribute {
    color: var(--color-plain-200);
  }

  .ui-style-value .ui-code-string {
    color: var(--color-plain-300);
  }

  .ui-style-value .ui-code-number {
    color: var(--color-plain-400);
  }

  .ui-style-value .ui-code-punctuation {
    color: var(--color-plain-500);
  }
</style>
