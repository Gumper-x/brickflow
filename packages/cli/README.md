# @brickflow/cli

## Fix SVG files

Recursively convert monochrome SVG files in place with SVGO and Skia's vector operations via [@napi-rs/canvas](https://github.com/Brooooooklyn/canvas). Strokes are expanded geometrically into filled paths without rasterization or tracing.

```sh
brick svg-fix ./icons/logo.svg
brick svg-fix ./icons
brick svg-fix ./icons ./assets/icons ./logo.svg
brick svg-fix --path ./icons --path ./assets/icons
brick svg-fix --help
```

From the repository root:

```sh
node ./packages/cli/index.mjs svg-fix ./icons ./assets/icons
```

Pass one or more paths as separate arguments, or repeat `--path` (`-p`). Each path can be a directory or an individual SVG file. Relative paths are resolved from the current working directory. Directories are searched recursively, and files with an `.svg` extension (case-insensitive) are processed. Other files and symbolic links discovered inside directories are skipped.

SVG files are overwritten at their original paths; there is no `--output` option. Repeated or overlapping paths do not cause a file to be processed more than once. All input paths are scanned before any files are changed. A file that cannot be converted is reported without rewriting it, and processing continues with the remaining files. The final summary includes failed files separately from unchanged files, and the command exits with code 1 if any file failed.

Already compatible SVGs with one or more filled paths, including paths inside groups, are preserved exactly, including their path notation, attributes and formatting. Paths with `fill="none"` can remain, and an explicit closing `Z` is not required. For SVGs with a zero-origin viewBox and no CSS, effects or transforms, the converter compares the painted SVG geometry with the combined nonzero contours that the font generator reads. Conversion is skipped when they match; overlapping paths with conflicting winding and evenodd holes are converted when needed.

When conversion is needed, the result contains one path with `fill="currentColor"` and nonzero winding, including correctly oriented holes. Nested transforms and inherited presentation styles are applied. Width and height are preserved only when specified; missing dimensions are never added from the viewBox. Relative display dimensions such as `width="1em"` are preserved when a `viewBox` is present. No Python, Inkscape, or browser installation is needed.

Repeated runs leave the normalized SVG byte-for-byte unchanged and do not rewrite it or update its modification time. The CLI reports `Fixed 0 SVG file(s); unchanged 1` when a single file is already normalized.

Supported geometry: paths, lines, polygons, polylines, circles, ellipses, and rectangles (including rounded corners). Strokes support butt/round/square caps, miter/round/bevel joins, and positive one- or two-value dash patterns. Geometry lengths must be unitless or use `px`.

Unsupported features cause an error before that file is rewritten: gradients, multiple colors, partial opacity, masks, clipping, references (`use`), text, images, animations, non-scaling strokes, and unresolved CSS. These require explicit preparation as monochrome paths. For example, the playground's gradient-based `loading.svg` cannot preserve its appearance in a monochrome icon font.
