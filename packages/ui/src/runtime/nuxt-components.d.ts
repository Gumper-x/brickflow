import type { defineNuxtLink } from 'nuxt/app'

declare module 'vue' {
  interface GlobalComponents {
    NuxtLink: ReturnType<typeof defineNuxtLink>
  }
}
