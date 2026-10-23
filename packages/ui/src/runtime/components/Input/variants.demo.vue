<script lang="ts">
  export const uiDemo = {
    title: 'Variants & Disabled',
  }
</script>

<script lang="ts" setup>
  import { onMounted, ref } from 'vue'

  import { uiConfig } from '#brickflow-ui'

  import { rule } from '../../utils/rules'
  import Input from './index.vue'

  const inputConfig = uiConfig.input
  const errorInputs = ref<InstanceType<typeof Input>[]>([])

  onMounted(() => {
    errorInputs.value.forEach((input) => input.validate())
  })
</script>

<template>
  <div class="flex max-w-sm flex-col gap-4">
    <div
      v-for="(_, variant) in inputConfig.variantClasses"
      :key="variant"
      class="flex flex-col gap-3"
    >
      <Input
        :variant="variant"
        :label="`Variant ${variant}`"
        placeholder="Type here"
      />
      <Input
        ref="errorInputs"
        :variant="variant"
        :label="`Error ${variant}`"
        :rules="[rule.required(), rule.minLength(4)]"
        description="This description is hidden while the field has an error"
        placeholder="Required field"
      />
      <Input
        :variant="variant"
        :label="`Disabled ${variant}`"
        value="Unavailable"
        disabled
      />
    </div>
  </div>
</template>
