<template>
  <NuxtLink
    ref="linkRef"
    data-allow-mismatch
    v-bind="prepareProps"
  >
    <slot />
  </NuxtLink>
</template>

<script lang="ts" setup>
  import { type ComponentPublicInstance, computed, ref } from 'vue'
  import { type RouteLocationPathRaw, type RouteLocationRaw, useRouter } from 'vue-router'

  import { useTranslate } from '../../composables/useTranslate'

  defineOptions({ inheritAttrs: false })

  const props = withDefaults(
    defineProps<{
      activeClass?: string
      class?: (false | string)[] | string
      custom?: boolean
      exactActiveClass?: string
      external?: boolean
      faster?: boolean
      href?: RouteLocationRaw
      onClick?: () => void
      onPointerdown?: () => void
      prefetch?: boolean
      rel?: null | string
      replace?: boolean
      style?: Record<string, string>
      target?: '_blank' | '_parent' | '_self' | '_top' | null | (Record<string, never> & string)
      to?: RouteLocationRaw
    }>(),
    {
      activeClass: undefined,
      class: undefined,
      custom: false,
      exactActiveClass: undefined,
      external: false,
      faster: false,
      href: undefined,
      onClick: undefined,
      onPointerdown: undefined,
      prefetch: false,
      rel: undefined,
      replace: false,
      style: undefined,
      target: undefined,
      to: undefined,
    },
  )
  const { localePath } = useTranslate()

  const prepareProps = computed(() => {
    const { faster: _faster, onPointerdown: _onPointerdown, ...linkProps } = props
    const refineDrops = { ...linkProps, onPointerdown: props.faster ? handlePointerDown : undefined }

    if (typeof props.to === 'string') {
      return { ...refineDrops, to: localePath(props.to) }
    } else if ((props.to as RouteLocationPathRaw)?.path) {
      return { ...refineDrops, to: { ...props.to, path: localePath((props.to as RouteLocationPathRaw).path) } }
    }

    return refineDrops
  })
  const linkRef = ref<ComponentPublicInstance>()

  function handlePointerDown(e: PointerEvent): void {
    const router = useRouter()
    props.onPointerdown?.()
    if (e.button !== 0) {
      return
    }
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
      return
    }

    e.preventDefault()

    const to = prepareProps.value.to

    if (!to) {
      return
    }

    props.replace ? router.replace(to) : router.push(to)
  }

  defineExpose({ linkRef })
</script>
