<script lang="ts">
  export const uiDemo = {
    title: 'Validation errors',
  }
</script>

<script lang="ts" setup>
  import { onMounted, ref } from 'vue'

  import { rule } from '../../utils/rules'
  import Input from './index.vue'

  const ruleInput = ref<InstanceType<typeof Input> | null>(null)
  const customErrorInput = ref<InstanceType<typeof Input> | null>(null)

  onMounted(() => {
    ruleInput.value?.validate()
    customErrorInput.value?.validate()
  })
</script>

<template>
  <div class="flex max-w-sm flex-col gap-4">
    <Input
      ref="ruleInput"
      label="Rule error"
      :rules="[rule.required(), rule.minLength(4)]"
      description="This description is hidden while the field has an error"
      placeholder="Required field"
    />
    <Input
      ref="customErrorInput"
      label="Custom error"
      :rules="[rule.required()]"
      description="This description is hidden while the field has an error"
      descriptionError="Custom error takes priority over rules"
      placeholder="Required field"
    />
  </div>
</template>
