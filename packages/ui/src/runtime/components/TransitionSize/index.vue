<template>
  <Transition
    :name="props.name"
    :mode="props.mode"
    @beforeEnter="beforeStart"
    @enter="start"
    @afterEnter="afterEnter"
    @beforeLeave="beforeLeave"
    @leave="leave"
    @afterLeave="afterLeave"
  >
    <slot></slot>
  </Transition>
</template>

<script lang="ts" setup>
  import { computed, nextTick, ref } from 'vue'

  const props = withDefaults(
    defineProps<{
      dimension?: 'height' | 'width'
      duration?: number
      expandClasses?: ''
      flexParent?: Element
      mode?: 'default' | 'in-out' | 'out-in'
      name?: string
    }>(),
    {
      dimension: 'height',
      duration: 300,
      expandClasses: '',
      flexParent: undefined,
      gap: 0,
      mode: undefined,
      name: undefined,
    },
  )

  const gap = ref(0)

  const sizeName = computed(() => props.dimension)
  const marginName = computed(() => (props.dimension === 'height' ? 'marginBottom' : 'marginRight'))
  const scrollName = computed(() => (props.dimension === 'height' ? 'scrollHeight' : 'scrollWidth'))
  const expandClass = computed(() => {
    return (props.expandClasses || '!transition-all !ease-in-out !overflow-hidden will-change-transform').split(
      ' ',
    )
  })

  const beforeStart = (event: Element): void => {
    const el = event as HTMLElement
    shrink(el)
  }
  const start = (event: Element): void => {
    const el = event as HTMLElement
    el.dataset.oldOverflow = el.style.overflow

    // Wait until component mounted to get proper height
    nextTick(() => {
      if (el[scrollName.value] === 0) {
        el.style[sizeName.value] = ''
      } else {
        el.style[sizeName.value] = `${el[scrollName.value]}px`
        el.style.padding = ''
        if (props.flexParent) {
          el.style[marginName.value] = ''
        }
      }
      el.style.overflow = 'hidden'
    })
  }
  const afterEnter = (event: Element): void => {
    const el = event as HTMLElement
    release(el)
  }
  const beforeLeave = (event: Element): void => {
    const el = event as HTMLElement
    const computedStyle = getComputedStyle(el)
    el.dataset.oldOverflow = computedStyle.overflow

    el.style[sizeName.value] = `${el[scrollName.value]}px`
    if (props.flexParent) {
      el.style[marginName.value] = ''
    }
    el.style.overflow = 'hidden'
  }
  const leave = (event: Element): void => {
    const el = event as HTMLElement
    if (el[scrollName.value] !== 0) {
      shrink(el)
    }
  }
  const afterLeave = (event: Element): void => {
    const el = event as HTMLElement
    release(el)
  }

  function release(el: HTMLElement): void {
    el.classList.add(...expandClass.value)
    el.style.transitionDuration = ''
    el.style[sizeName.value] = ''
    el.style[marginName.value] = ''
    el.style.overflow = String(el.dataset.oldOverflow)
  }
  function shrink(el: HTMLElement): void {
    el.classList.add(...expandClass.value)
    el.style.transitionDuration = `${props.duration}ms`
    el.style[sizeName.value] = '0'
    el.style.padding = '0'
    if (props.flexParent) {
      gap.value = parseInt(window.getComputedStyle(props.flexParent)?.gap) || 0
      el.style[marginName.value] = `-${gap.value}px`
    }
  }
</script>
