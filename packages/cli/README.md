# @brickflow/cli

## Fix SVG files

Recursively process SVG files in place with [oslllo-svg-fixer](https://github.com/oslllo/svg-fixer), converting strokes to filled paths for icon fonts.

```sh
brick svg-fix ./icons
brick svg-fix ./icons ./assets/icons ./logo.svg
brick svg-fix --path ./icons --path ./assets/icons
brick svg-fix --help
```

From the repository root:

```sh
pnpm svg-fix ./icons ./assets/icons
```

Pass one or more paths as separate arguments, or repeat `--path` (`-p`). Each path can be a directory or an individual SVG file. Relative paths are resolved from the current working directory. Directories are searched recursively, and files with an `.svg` extension (case-insensitive) are processed. Other files and symbolic links discovered inside directories are skipped.

SVG files are overwritten at their original paths; there is no `--output` option. Repeated or overlapping paths do not cause a file to be processed more than once. All input paths are scanned before any files are changed. Processing stops with exit code 1 if a file fails; files already processed remain changed.
