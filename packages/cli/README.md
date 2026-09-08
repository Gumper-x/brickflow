# @brickflow/cli

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

`svg-fix` has one responsibility: elements with a visible computed `stroke` are converted to filled outline paths. Elements without strokes are never structurally or geometrically normalized. The root SVG, viewBox, dimensions, groups, definitions, metadata, fill-only shapes, IDs, classes, and transforms remain in place.

Stroke detection includes inline CSS, CSS classes, CSS variables, and inherited presentation attributes. Expansion supports paths, lines, polygons, polylines, circles, ellipses, and rectangles, including line caps, joins, miter limits, arbitrary dash arrays, and dash offsets. Transforms are preserved and apply to the generated outline exactly where they applied to the original element.

If a stroked element also has a visible fill, its original fill geometry is kept and a separate outline path is inserted beside it. If it has no fill, only that element is replaced by its outline. SVG files with no visible strokes are returned byte-for-byte unchanged. Repeated runs are idempotent.

Run `brick svg` first for general SVGO optimization and `brick svg-fix` last for stroke expansion. After all strokes are expanded, later `svg-fix` runs do nothing; the two commands no longer alternate between competing canonical formats.

Geometry and stroke lengths must be unitless or use `px`. Non-scaling strokes are rejected because expanding them correctly would require changing transforms; the original file is left untouched on failure.
