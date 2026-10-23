<script lang="ts">
  export const uiDemo = {
    title: 'Email & Password',
  }
</script>

<script lang="ts" setup>
  import { ref } from 'vue'

  import { rule } from '../../utils/rules'
  import Button from '../Button/index.vue'
  import Input from '../Input/index.vue'
  import Form from './index.vue'

  const email = ref('')
  const password = ref('')
  const submittedEmail = ref('')
  const emailRules = [
    rule.required(),
    rule.email(),
    rule.regex(/\.com$/i, () => 'CUSTOM RULE: Use a .com email address'),
  ]
  const passwordRules = [rule.required(), rule.minLength(8)]

  function handleSubmit(): void {
    submittedEmail.value = email.value
  }
</script>

<template>
  <Form
    class="max-w-sm"
    @submit.prevent="handleSubmit"
  >
    <Input
      :value="email"
      label="Email"
      placeholder="example@oyes.com"
      type="email"
      :rules="emailRules"
      description="Only .com"
      autocomplete="email"
      @input="email = $event"
    />
    <Input
      :value="password"
      placeholder="**********"
      label="Password"
      type="password"
      :rules="passwordRules"
      autocomplete="current-password"
      @input="password = $event"
    />
    <Button
      type="submit"
      class="self-start"
    >
      Sign in
    </Button>
    <p
      v-if="submittedEmail"
      role="status"
      class="text-sm"
    >
      Submitted for {{ submittedEmail }}
    </p>
  </Form>
</template>
