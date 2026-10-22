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
      flexDirection?: 'center' | 'end' | 'start'
      flexParent?: Element | null
      mode?: 'default' | 'in-out' | 'out-in'
      name?: string
    }>(),
    {
      dimension: 'height',
      duration: 300,
      expandClasses: '',
      flexDirection: 'start',
      flexParent: undefined,
      gap: 0,
      mode: undefined,
      name: undefined,
    },
  )

  const gap = ref(0)

  const sizeName = computed(() => props.dimension)
  const scrollName = computed(() => (props.dimension === 'height' ? 'offsetHeight' : 'offsetWidth'))
  const expandClass = computed(() => {
    return (props.expandClasses || '!transition-all !ease-in-out').split(' ')
  })

  const beforeStart = (event: Element): void => {
    const el = event as HTMLElement
    el.style.setProperty('transition-duration', `${0}ms`, 'important')
  }
  const start = (event: Element): void => {
    const el = event as HTMLElement
    el.dataset.oldOverflow = el.style.overflow

    // Wait until component mounted to get proper height
    nextTick(() => {
      releasePadding(el)
      const height = el[scrollName.value]
      shrinkPadding(el)
      shrink(el)
      el.style.overflow = 'hidden'
      requestAnimationFrame(() => {
        el.style.setProperty('transition-duration', `${props.duration}ms`, 'important')
        if (height === 0) {
          el.style[sizeName.value] = ''
          releasePadding(el)
        } else {
          el.style[sizeName.value] = `${height}px`
          releasePadding(el)
          setNegativeMargin(el, 0)
        }
      })
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
      el.style.setProperty('flex-shrink', '0', 'important')
      el.style.setProperty('flex-grow', '0', 'important')
    }
    el.style.overflow = 'hidden'
  }
  const leave = (event: Element): void => {
    const el = event as HTMLElement
    if (el[scrollName.value] !== 0) {
      el.style.setProperty('transition-duration', `${props.duration}ms`, 'important')
      shrink(el)
    }
  }
  const afterLeave = (event: Element): void => {
    const el = event as HTMLElement
    release(el)
  }

  function release(el: HTMLElement): void {
    el.classList.remove(...expandClass.value)
    el.style.transitionDuration = ''
    el.style.flexGrow = ''
    el.style.flexShrink = ''
    el.style[sizeName.value] = ''
    el.style.overflow = String(el.dataset.oldOverflow)
    setNegativeMargin(el, 0)
    releasePadding(el)
  }
  function releasePadding(el: HTMLElement): void {
    if (props.dimension === 'height') {
      el.style.paddingTop = ''
      el.style.paddingBottom = ''
    } else {
      el.style.paddingLeft = ''
      el.style.paddingRight = ''
    }
  }

  function setNegativeMargin(el: HTMLElement, value?: number): void {
    if (value === undefined || !props.flexParent) {
      return
    }
    switch (props.flexDirection) {
      case 'center':
        el.style[props.dimension === 'height' ? 'marginTop' : 'marginLeft'] = value ? `-${value / 2}px` : ''
        el.style[props.dimension === 'height' ? 'marginBottom' : 'marginRight'] = value ? `-${value / 2}px` : ''
        break
      case 'end':
        el.style[props.dimension === 'height' ? 'marginTop' : 'marginLeft'] = value ? `-${value}px` : ''
        break
      case 'start':
        el.style[props.dimension === 'height' ? 'marginBottom' : 'marginRight'] = value ? `-${value}px` : ''
        break
      default:
    }
  }

  function shrink(el: HTMLElement): void {
    el.classList.add(...expandClass.value)
    el.style.flexGrow = '0'
    el.style[sizeName.value] = '0'
    shrinkPadding(el)
    if (props.flexParent) {
      gap.value = parseInt(window.getComputedStyle(props.flexParent)?.gap) || 0
      setNegativeMargin(el, gap.value)
    }
  }
  function shrinkPadding(el: HTMLElement): void {
    if (props.dimension === 'height') {
      el.style.paddingTop = '0'
      el.style.paddingBottom = '0'
    } else {
      el.style.paddingLeft = '0'
      el.style.paddingRight = '0'
    }
  }
</script>
