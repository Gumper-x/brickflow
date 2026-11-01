<script lang="ts">
  export const uiDemo = {
    description: 'Each field has one rule. Submit it to see that rule’s validation message.',
    title: 'Basic rules',
  }
</script>

<script setup lang="ts">
  import { reactive } from 'vue'

  import { rule, type Rule } from '../../utils/rules'
  import Button from '../Button/index.vue'
  import Input from '../Input/index.vue'
  import Form from './index.vue'

  const demos: { description: string; id: string; label: string; placeholder: string; rules: Rule<string>[] }[] = [
    {
      description: 'Leave empty, or enter only spaces.',
      id: 'required',
      label: 'Required',
      placeholder: 'Enter any text',
      rules: [rule.required()],
    },
    {
      description: 'Try “hello”, then “hello@example.com”.',
      id: 'email',
      label: 'Email',
      placeholder: 'hello@example.com',
      rules: [rule.email()],
    },
    {
      description: 'Enter exactly 5 characters.',
      id: 'length',
      label: 'Length (5)',
      placeholder: 'abcde',
      rules: [rule.length(5)],
    },
    {
      description: 'Enter fewer than 5 characters, then 5 or more.',
      id: 'minLength',
      label: 'Minimum length (5)',
      placeholder: 'At least 5 characters',
      rules: [rule.minLength(5)],
    },
    {
      description: 'Enter more than 5 characters.',
      id: 'maxLength',
      label: 'Maximum length (5)',
      placeholder: 'Up to 5 characters',
      rules: [rule.maxLength(5)],
    },
    {
      description: 'Enter letters or numbers, then add a space or symbol.',
      id: 'regex',
      label: 'Regex (letters and numbers)',
      placeholder: 'abc123',
      rules: [rule.regex(/^[a-z0-9]+$/i, 'Use letters and numbers only')],
    },
    {
      description: 'Try “example.com”, then “https://example.com”.',
      id: 'url',
      label: 'URL',
      placeholder: 'https://example.com',
      rules: [rule.url()],
    },
  ]

  const values = reactive<Record<string, string>>({})
  const submitted = reactive<Record<string, boolean>>({})

  function updateValue(id: string, value: string): void {
    values[id] = value
    submitted[id] = false
  }
</script>

<template>
  <div class="grid gap-6">
    <Form
      v-for="demo in demos"
      :key="demo.id"
      class="rounded-lg"
      @submit="submitted[demo.id] = true"
    >
      <Input
        :value="values[demo.id] ?? ''"
        :label="demo.label"
        :description="demo.description"
        :placeholder="demo.placeholder"
        :rules="demo.rules"
        @input="updateValue(demo.id, $event)"
      />
      <Button
        class="self-start"
        type="submit"
      >
        Test rule
      </Button>
      <p
        v-if="submitted[demo.id]"
        class="text-sm text-green-400"
        role="status"
      >
        Passed
      </p>
    </Form>
  </div>
</template>
