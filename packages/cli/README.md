# @brickflow/cli

## Unused Nuxt components

```sh
brick component-unused [--app <nuxt-project>] [--root <workspace>]
```

The command checks auto-imported `.vue` files in `components/` and `app/components/` across local Nuxt projects. It finds component tags (including kebab-case and `Lazy` names), `#components` imports, `resolveComponent` calls, and component references in scripts and template expressions. Local `extends` links make a layer's components available to its consumers. A component used only in a consuming project is reported separately from components unused everywhere. `--app` limits the result to components owned by one project; all local projects are still scanned for usage. The command exits with code 1 when unused components exist. Dynamic component names and components registered by arbitrary module code cannot be resolved statically.

From this repository, run `pnpm lint:component`.

## Fix SVG files

Recursively expand SVG strokes to filled outlines. The command uses SVGO to resolve CSS and [@napi-rs/canvas](https://github.com/Brooooooklyn/canvas) for vector stroke geometry. It does not rasterize or trace artwork.

```sh
brick svg-fix ./icons/logo.svg
brick svg-fix ./icons
brick svg-fix ./icons ./assets/icons ./logo.svg
brick svg-fix --path ./icons --path ./assets/icons
brick svg-fix --verbose ./icons
brick svg-fix --help
```

From the repository root:

```sh
node ./packages/cli/index.mjs svg-fix ./icons ./assets/icons
```

Pass one or more paths as separate arguments, or repeat `--path` (`-p`). Each path can be a directory or an individual SVG file. Relative paths are resolved from the current working directory. Directories are searched recursively, and files with an `.svg` extension (case-insensitive) are processed. Other files and symbolic links discovered inside directories are skipped.

SVG files are overwritten at their original paths; there is no `--output` option. Repeated or overlapping paths do not cause a file to be processed more than once. All input paths are scanned before any files are changed. A file that cannot be converted is reported without rewriting it, and processing continues with the remaining files. The final summary includes failed files separately from unchanged files, and the command exits with code 1 if any file failed.

`svg-fix` converts SVG text and elements with a visible computed `stroke` to filled outline paths. SVGs without text or visible strokes remain byte-for-byte unchanged. Text conversion uses the available system fonts and may normalize other markup in the same SVG; the root SVG attributes are retained.

Stroke detection includes inline CSS, CSS classes, CSS variables, and inherited presentation attributes. Expansion supports paths, lines, polygons, polylines, circles, ellipses, and rectangles, including line caps, joins, miter limits, arbitrary dash arrays, and dash offsets. Transforms are preserved and apply to the generated outline exactly where they applied to the original element.

If a stroked element also has a visible fill, its original fill geometry is kept and a separate outline path is inserted beside it. If it has no fill, only that element is replaced by its outline. SVG files with no visible strokes are returned byte-for-byte unchanged. Repeated runs are idempotent.

Run `brick svg` first for general SVGO optimization and `brick svg-fix` last for stroke expansion. After all strokes are expanded, later `svg-fix` runs do nothing; the two commands no longer alternate between competing canonical formats.

Geometry and stroke lengths must be unitless or use `px`. Non-scaling strokes are rejected because expanding them correctly would require changing transforms; the original file is left untouched on failure.

## Translation directories

`brick translate-sync`, `brick translate-context` and `brick translate` look for translatable sources in `packages/brick` and `apps/*` by default. Pass `--dirs` to use other directories:

```sh
brick translate-sync --dirs "packages/stem,apps/*"
```

Directories are comma-separated, relative to the workspace root, and may contain globs. Quote the value so the shell does not expand `*`.
