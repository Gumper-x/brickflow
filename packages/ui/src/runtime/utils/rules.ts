import { useBrickflow } from '../composables/useBrickflow'

export type Rule<T> = (value: T) => string | true
export interface RuleMessages {
  email: () => string
  length: (params: { length: number }) => string
  maxLength: (params: { max: number }) => string
  minLength: (params: { min: number }) => string
  required: () => string
  url: () => string
}

export const defaultRuleMessages: RuleMessages = {
  email: () => 'Enter a valid email',
  length: ({ length: expectedLength }) => `Must be exactly ${expectedLength} characters`,
  maxLength: ({ max }) => `Maximum ${max} characters`,
  minLength: ({ min }) => `Minimum ${min} characters`,
  required: () => 'Required field',
  url: () => 'Enter a valid URL',
}

export const rule = { email, length, maxLength, minLength, regex, required, url }

function email(): Rule<string> {
  const messages = { ...defaultRuleMessages, ...useBrickflow().rules }
  return (value) => {
    if (!value) {
      return true
    }
    const parts = value.split('@')
    const domain = parts[1]
    return (
      (parts.length === 2 && Boolean(parts[0]) && Boolean(domain?.includes('.')) && !/\s/.test(value)) ||
      messages.email()
    )
  }
}

function length(expectedLength: number): Rule<string> {
  const messages = { ...defaultRuleMessages, ...useBrickflow().rules }
  return (value) => !value || value.length === expectedLength || messages.length({ length: expectedLength })
}

function maxLength(max: number): Rule<string> {
  const messages = { ...defaultRuleMessages, ...useBrickflow().rules }
  return (value) => !value || value.length <= max || messages.maxLength({ max })
}

function minLength(min: number): Rule<string> {
  const messages = { ...defaultRuleMessages, ...useBrickflow().rules }
  return (value) => !value || value.length >= min || messages.minLength({ min })
}

function regex(pattern: RegExp, message: (() => string) | string): Rule<string> {
  return (value) => {
    pattern.lastIndex = 0
    return !value || pattern.test(value) || (typeof message === 'function' ? message() : message)
  }
}

function required<T>(): Rule<T> {
  const messages = { ...defaultRuleMessages, ...useBrickflow().rules }
  return (value) => {
    if (typeof value === 'string') {
      return value.trim().length > 0 || messages.required()
    }
    if (typeof value === 'boolean') {
      return value || messages.required()
    }
    if (Array.isArray(value)) {
      return value.length > 0 || messages.required()
    }
    return (value !== null && value !== undefined) || messages.required()
  }
}

function url(): Rule<string> {
  const messages = { ...defaultRuleMessages, ...useBrickflow().rules }
  return (value) => {
    if (!value) {
      return true
    }
    try {
      const parsed = new URL(value)
      return (['http:', 'https:'].includes(parsed.protocol) && Boolean(parsed.hostname)) || messages.url()
    } catch {
      return messages.url()
    }
  }
}
