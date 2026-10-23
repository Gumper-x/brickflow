# Field rules

Configure messages for built-in rules once in the Brickflow provider. Message functions are called when validation fails, so they can use the current locale.

```ts
provideBrickflow(nuxtApp.vueApp, {
  rules: {
    required: () => t('Required field'),
    email: () => t('Enter a valid email'),
    length: ({ length }) => t(`Must be exactly ${length} characters`),
    maxLength: ({ max }) => t(`Maximum ${max} characters`),
    minLength: ({ min }) => t(`Minimum ${min} characters`),
    url: () => t('Enter a valid URL'),
  },
})
```

Use the Nuxt auto-imported `rule` object, then pass its rules to `Input` or `InputNumber`. It is also exported from `@brickflow/ui`.

```vue
<script setup lang="ts">
const emailRules = [rule.required(), rule.email(), rule.regex(/\.com$/i, () => t('Use a .com address'))]
const ageRules = [rule.required()]
</script>

<template>
<Input
  :value="emailAddress"
  :rules="emailRules"
  @input="emailAddress = $event"
/>

<InputNumber :value="age" :rules="ageRules" @input="age = $event" />
</template>
```

`regex(pattern, message)` accepts a `RegExp` and a string or function returning a string. The function is evaluated when validation fails, so it can translate using the active locale. `minLength(min)`, `maxLength(max)`, and `length(length)` check string length. `url()` accepts HTTP and HTTPS URLs. All of these rules accept an empty optional field; combine them with `required()` when the field must have a value.

A custom rule receives the field value and returns `true` or an error string. For example:

```ts
const companyEmail = (value: string) =>
  value.endsWith('@company.com') || t('Use your company email')
```

`Form` validates all registered fields on submit, then focuses the first invalid field. It calls `onSubmit` when all fields pass and `onInvalid` otherwise. A form ref exposes `validate()` for manual checks. Errors are hidden until the first submit or manual validation; after that, each field updates its own error as the user types. Rules also work without a surrounding `Form` when the field's exposed `validate()` method is called.

Create rules with `rule.required()` and other factories inside component setup so they can read the nearest Brickflow provider.
