# Brick

#### UI, CLI, LINT, CODE STYLE

### Unused icons

Run `pnpm lint:icon` to check unused and duplicate SVGs in the playground, in that order. The duplicate check runs only when the unused check passes. For another Nuxt app, run `brick icon-unused --app <app-directory>` and `brick icon-duplicate <icons-directory>`. The unused check reads `brickflowUi.iconsPath` from the app's `nuxt.config.ts`.

The check counts literal values passed to component props typed as `IconName`, fields typed as `IconName` in `defineUiConfig`, and the declared results of `parseIcon`. Unrelated text and UI component demos do not count. Unused SVGs, unknown names, and dynamic icon expressions without a declaration fail the command. Terminal output uses colors and links to each SVG; when redirected, it prints plain `path:line` references. `NO_COLOR` disables colors.

For icon names from an API or a composed value, declare every expected result:

```ts
import { parseIcon } from '#brickflow-ui'

const icon = parseIcon(apiItem.icon, {
  allowed: ['cart', 'rocket'],
  fallback: 'x',
})
```

At runtime, `parseIcon` returns the input when it is allowed and returns `fallback` otherwise. The `allowed` list and `fallback` must contain literal SVG names so the check can read them. ESLint rejects `as IconName` assertions.
