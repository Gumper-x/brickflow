import { useRuntimeConfig } from 'nuxt/app'
import { computed, type ComputedRef } from 'vue'

interface brickflowComposable {
  className: ComputedRef<string>
  message: ComputedRef<string>
}

interface brickflowPublicConfig {
  message?: string
}

export const usebrickflow = (): brickflowComposable => {
  const config = useRuntimeConfig()
  const brickflowConfig = computed(() => (config.public.brickflowUi ?? {}) as brickflowPublicConfig)
  const message = computed(() => brickflowConfig.value.message ?? 'Hello world')
  const className = computed(() => UI_STYLE.state.world)

  return {
    className,
    message,
  }
}
