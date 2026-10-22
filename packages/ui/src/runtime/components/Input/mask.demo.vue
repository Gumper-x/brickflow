<script lang="ts">
  export const uiDemo = {
    description:
      'Use Maska tokens in the mask prop. Pass an options object for custom tokens or an array for alternative masks.',
    title: 'Mask',
  }
</script>

<script lang="ts" setup>
  import { ref } from 'vue'

  import Input from './index.vue'

  const phone = ref('')
  const digits = ref('')
  const alternativeMasks = ['###-###', '###-###-###']
  const customMask = {
    mask: 'AA-####',
    tokens: {
      A: { pattern: /[a-z]/i, transform: (character: string) => character.toUpperCase() },
    },
  }
</script>

<template>
  <div class="flex max-w-sm flex-col gap-5">
    <p class="text-sm text-zinc-400">
      Default tokens:
      <code>#</code>
      is a digit,
      <code>@</code>
      is a letter, and
      <code>*</code>
      is a letter or digit. Other characters are literals; prefix a token with
      <code>!</code>
      to display it literally. See
      <a
        class="text-blue-400 underline"
        href="https://beholdr.github.io/maska/v3/#/tokens"
        target="_blank"
        rel="noopener noreferrer"
      >
        Maska token documentation
      </a>
      .
    </p>
    <Input
      :value="phone"
      mask="+## (###) ###-##-##"
      label="Phone: +## (###) ###-##-##"
      placeholder="+48 (123) 456-78-90"
      type="tel"
      @input="(value) => (phone = value)"
      @mask="(detail) => (digits = detail.unmasked)"
    />
    <div class="text-sm text-zinc-400">Masked: {{ phone }} · Raw: {{ digits }}</div>
    <Input
      mask="@@-####"
      label="Letters and digits: @@-####"
      placeholder="AB-1234"
    />
    <Input
      :mask="alternativeMasks"
      label="Alternative lengths: ###-### or ###-###-###"
      placeholder="123-456-789"
    />
    <Input
      :mask="customMask"
      label="Custom uppercase token: AA-####"
      placeholder="AB-1234"
    />
  </div>
</template>
