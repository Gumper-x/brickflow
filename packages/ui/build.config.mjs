export default {
  hooks: {
    'mkdist:entry:options'(_context, _entry, options) {
      // Keep Vue SFCs intact: Nuxt reads their defineUiConfig<T>() schemas and
      // transforms the macros using the consuming application's ui.config.ts.
      options.loaders = ['js', 'sass', 'postcss']
    },
  },
}
