<script lang="ts">
  export const uiDemo = {
    title: 'Read-only & Slot',
  }
</script>

<script lang="ts" setup>
  import { firstIconName } from '#brickflow-ui'

  import Input from './index.vue'
</script>

<template>
  <div class="max-w-sm">
    <Input
      label="Read-only value"
      value="You can select this text"
      :trailingIcon="firstIconName"
      readonly
    >
      <template #trailing>
        <div class="h-full bg-red-900 text-red-300">SLOT TEXT</div>
      </template>
    </Input>
  </div>
</template>
