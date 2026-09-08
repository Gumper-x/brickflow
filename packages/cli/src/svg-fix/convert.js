import { FillType, Path2D, PathOp, StrokeCap, StrokeJoin } from '@napi-rs/canvas'
import { optimize } from 'svgo'
import svgpath from 'svgpath'
import { compose, fromDefinition, fromTransformAttribute, identity, scale, translate } from 'transformation-matrix'

// Skia's curve-offset tolerance uses coordinate units. Working at a larger
// scale keeps small icon strokes accurate before returning to SVG coordinates.
const STROKE_PRECISION_SCALE = 64

const DEFAULT_STYLE = {
  color: '#000',
  fill: '#000',
  'fill-opacity': '1',
  'fill-rule': 'nonzero',
  stroke: 'none',
  'stroke-dasharray': 'none',
  'stroke-dashoffset': '0',
  'stroke-linecap': 'butt',
  'stroke-linejoin': 'miter',
  'stroke-miterlimit': '4',
  'stroke-opacity': '1',
  'stroke-width': '1',
  visibility: 'visible',
}
const IGNORED_ELEMENTS = new Set(['defs', 'desc', 'metadata', 'title'])
const ALLOWED_ATTRIBUTES = new Set([
  ...Object.keys(DEFAULT_STYLE),
  'class',
  'clip-rule',
  'cx',
  'cy',
  'd',
  'display',
  'height',
  'id',
  'opacity',
  'points',
  'r',
  'role',
  'rx',
  'ry',
  'transform',
  'version',
  'viewBox',
  'width',
  'x',
  'x1',
  'x2',
  'y',
  'y1',
  'y2',
])
const READY_ATTRIBUTES = new Set([
  'clip-rule',
  'color',
  'd',
  'fill',
  'fill-opacity',
  'fill-rule',
  'height',
  'id',
  'opacity',
  'stroke',
  'stroke-opacity',
  'stroke-width',
  'version',
  'viewBox',
  'width',
  'xmlns',
])

// Already usable paths keep their original bytes. Only SVG features that need
// conversion go through Skia; its output also passes this readiness check.
export function convertSvg(source) {
  const originalRoot = parseSvg(source)
  const root = parseSvg(source, true)
  const viewBox = root.attributes.viewBox
    ? numberList(root.attributes.viewBox, 'viewBox')
    : [0, 0, length(root.attributes.width, 'width'), length(root.attributes.height, 'height')]

  if (viewBox.length !== 4 || viewBox[2] <= 0 || viewBox[3] <= 0) {
    throw new Error('SVG must have a valid viewBox or positive width and height.')
  }

  const dimensions = {
    height: root.attributes.height === undefined ? undefined : svgSize(root.attributes.height),
    viewBox: [0, 0, viewBox[2], viewBox[3]],
    width: root.attributes.width === undefined ? undefined : svgSize(root.attributes.width),
  }

  const context = { color: null }
  const outline = renderNode(root, DEFAULT_STYLE, translate(-viewBox[0], -viewBox[1]), context, true)

  if (viewBox[0] === 0 && viewBox[1] === 0 && isFontReady(originalRoot, outline)) {
    return source
  }

  const data = outline.simplify().asWinding().toSVGString()

  if (!data) {
    throw new Error('SVG has no visible geometry for an icon font.')
  }

  return serializeIcon(dimensions, data)
}

function appendFontPaths(node, paths) {
  if (node.type !== 'element') {
    return
  }
  // svgicons2svgfont concatenates path data and skips an explicit fill="none".
  // It does not apply inherited fill="none", opacity or evenodd winding.
  if (node.name === 'path' && node.attributes.d && node.attributes.fill !== 'none') {
    const data = node.attributes.d
    validatePath(data)
    // Reset the initial moveto between paths, preserving all other commands.
    // Expanding relative coordinates introduces rounding differences in arcs
    // that can make identical outlines appear different to Skia's XOR.
    paths.push(data.replace(/^\s*m/, 'M'))
  }
  for (const child of node.children) {
    appendFontPaths(child, paths)
  }
}

function createPath(node) {
  const attrs = node.attributes
  const num = (name, fallback = 0) => length(attrs[name] ?? fallback, name)
  const result = new Path2D()
  if (node.children.some((child) => child.type === 'element' && !IGNORED_ELEMENTS.has(child.name))) {
    throw new Error(`Unsupported child element inside <${node.name}>. Use static SVG paths.`)
  }

  switch (node.name) {
    case 'circle':
    case 'ellipse': {
      const rx = node.name === 'circle' ? num('r') : num('rx')
      const ry = node.name === 'circle' ? rx : num('ry')
      if (rx < 0 || ry < 0) {
        throw new Error('Ellipse radii must be non-negative.')
      }
      if (rx > 0 && ry > 0) {
        result.ellipse(num('cx'), num('cy'), rx, ry, 0, 0, Math.PI * 2)
        result.closePath()
      }
      return result
    }
    case 'line':
      result.moveTo(num('x1'), num('y1'))
      result.lineTo(num('x2'), num('y2'))
      return result
    case 'path':
      validatePath(attrs.d ?? '')
      return new Path2D(attrs.d ?? '')
    case 'polygon':
    case 'polyline': {
      const points = numberList(attrs.points ?? '', 'points')
      if (points.length % 2 !== 0) {
        throw new Error('Polygon/polyline points must be coordinate pairs.')
      }
      for (let index = 0; index < points.length; index += 2) {
        if (index === 0) {
          result.moveTo(points[index], points[index + 1])
        } else {
          result.lineTo(points[index], points[index + 1])
        }
      }
      if (node.name === 'polygon') {
        result.closePath()
      }
      return result
    }
    case 'rect': {
      const x = num('x')
      const y = num('y')
      const width = num('width')
      const height = num('height')
      const rx = Math.min(num('rx', attrs.ry ?? 0), width / 2)
      const ry = Math.min(num('ry', attrs.rx ?? 0), height / 2)
      if (Math.min(width, height, rx, ry) < 0) {
        throw new Error('Rectangle dimensions and corner radii must be non-negative.')
      }
      if (width === 0 || height === 0) {
        return result
      }
      if (rx === 0 || ry === 0) {
        result.rect(x, y, width, height)
        return result
      }
      return new Path2D(
        `M${x + rx} ${y}H${x + width - rx}A${rx} ${ry} 0 0 1 ${x + width} ${y + ry}V${y + height - ry}A${rx} ${ry} 0 0 1 ${x + width - rx} ${y + height}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + height - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`,
      )
    }
    default:
      throw new Error(`Unsupported <${node.name}>. Convert it to plain paths before building an icon font.`)
  }
}

function enumValue(value, options, name) {
  if (!Object.hasOwn(options, value)) {
    throw new Error(`Unsupported ${name}: ${value}`)
  }
  return options[value]
}

function hasReadyStructure(node, isRoot = false) {
  if (node.type !== 'element') {
    return true
  }
  // Inspect the original attributes so CSS, transforms and effects cannot be
  // hidden by SVGO's style normalization and accidentally bypass conversion.
  if (Object.keys(node.attributes).some((name) => !READY_ATTRIBUTES.has(name))) {
    return false
  }
  if (['desc', 'metadata', 'path', 'title'].includes(node.name)) {
    return !node.children.some((child) => child.type === 'element')
  }
  if (node.name === 'g' || (isRoot && node.name === 'svg')) {
    return node.children.every((child) => hasReadyStructure(child))
  }
  return false
}

function isFontReady(originalRoot, renderedOutline) {
  if (!hasReadyStructure(originalRoot, true) || !renderedOutline.toSVGString()) {
    return false
  }
  const paths = []
  appendFontPaths(originalRoot, paths)
  const fontOutline = new Path2D(paths.join(' '))
  // Fonts implicitly close contours and fill all paths together with nonzero
  // winding. Compare that result with SVG's separately painted paths: opposite
  // winding in overlapping paths or evenodd holes may still need conversion.
  return new Path2D(renderedOutline).op(fontOutline, PathOp.Xor).toSVGString() === ''
}

function length(value, name) {
  const text = String(value).trim()
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?(?:px)?$/i.test(text)) {
    throw new Error(`Unsupported ${name}: ${text}. Use numbers or px units.`)
  }
  const result = Number(text.replace(/px$/i, ''))
  if (!Number.isFinite(result)) {
    throw new Error(`Invalid ${name}: ${text}`)
  }
  return result
}

function numberList(value, name) {
  const text = value.trim()
  if (!text) {
    return []
  }
  return text.split(/[\s,]+/).map((item) => length(item, name))
}

function paintVisible(paint, opacity, style, context) {
  if (paint === 'none' || paint === 'transparent' || length(opacity, 'opacity') === 0) {
    return false
  }
  if (length(opacity, 'opacity') !== 1) {
    throw new Error('Partial opacity cannot be represented in a monochrome icon font.')
  }
  const color = paint === 'currentColor' ? style.color : paint
  if (/^url\(/i.test(color)) {
    throw new Error(
      `Gradient or pattern paint ${color} cannot be preserved in a monochrome icon font. Use a solid fill/stroke or keep this icon as SVG.`,
    )
  }
  if (!/^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(color)) {
    throw new Error(`Unsupported paint: ${color}. Use a solid monochrome fill/stroke.`)
  }
  if (context.color && context.color !== color.toLowerCase()) {
    throw new Error('Multiple colors cannot be represented in a monochrome icon font.')
  }
  context.color = color.toLowerCase()
  return true
}

function parseSvg(source, normalize = false) {
  let document
  optimize(source, {
    plugins: [
      ...(normalize
        ? [
            { name: 'inlineStyles', params: { onlyMatchedOnce: false } },
            'convertStyleToAttrs',
            { name: 'convertColors', params: { shortname: false } },
          ]
        : []),
      {
        fn: (root) => {
          document = root
        },
        name: 'collectDocument',
      },
    ],
  })
  const elements = document.children.filter((node) => node.type === 'element')
  if (elements.length !== 1 || elements[0].name !== 'svg') {
    throw new Error('Expected one <svg> root element.')
  }
  if (document.children.some((node) => node.type === 'instruction' && node.name !== 'xml')) {
    throw new Error('External stylesheets are not supported.')
  }
  return elements[0]
}

function renderNode(node, inherited, parentMatrix, context, isRoot = false) {
  const result = new Path2D()
  if (node.type !== 'element' || IGNORED_ELEMENTS.has(node.name)) {
    return result
  }
  const attrs = node.attributes
  if (attrs.display === 'none' || (attrs.opacity !== undefined && length(attrs.opacity, 'opacity') === 0)) {
    return result
  }
  validateAttributes(node)
  const style = { ...inherited }
  for (const key of Object.keys(DEFAULT_STYLE)) {
    if (attrs[key] !== undefined && attrs[key] !== 'inherit') {
      style[key] = attrs[key]
    }
  }
  const localMatrix = attrs.transform
    ? compose(fromDefinition(fromTransformAttribute(attrs.transform)))
    : identity()
  const matrix = compose(parentMatrix, localMatrix)
  if (!Object.values(matrix).every(Number.isFinite)) {
    throw new Error('Invalid transform matrix.')
  }

  if (node.name === 'g' || (node.name === 'svg' && isRoot)) {
    for (const child of node.children) {
      result.op(renderNode(child, style, matrix, context), PathOp.Union)
    }
    return result
  }
  if (style.visibility === 'hidden' || style.visibility === 'collapse') {
    return result
  }
  const geometry = createPath(node)
  if (paintVisible(style.fill, style['fill-opacity'], style, context)) {
    const fill = new Path2D(geometry)
    fill.setFillType(
      enumValue(style['fill-rule'], { evenodd: FillType.EvenOdd, nonzero: FillType.Winding }, 'fill-rule'),
    )
    result.op(fill.transform(matrix), PathOp.Union)
  }
  const width = length(style['stroke-width'], 'stroke-width')
  if (width < 0) {
    throw new Error('stroke-width must be non-negative.')
  }
  if (width > 0 && paintVisible(style.stroke, style['stroke-opacity'], style, context)) {
    const stroke = new Path2D(geometry)
    if (style['stroke-dasharray'] !== 'none') {
      const dash = numberList(style['stroke-dasharray'], 'stroke-dasharray')
      if (dash.length === 1) {
        dash.push(dash[0])
      }
      if (dash.length !== 2 || dash.some((value) => value <= 0)) {
        throw new Error('Only positive one- or two-value stroke-dasharray patterns are supported.')
      }
      stroke.dash(dash[0], dash[1], length(style['stroke-dashoffset'], 'stroke-dashoffset'))
    }
    const miterLimit = length(style['stroke-miterlimit'], 'stroke-miterlimit')
    if (miterLimit < 1) {
      throw new Error('stroke-miterlimit must be at least 1.')
    }
    stroke.transform(scale(STROKE_PRECISION_SCALE))
    stroke.stroke({
      cap: enumValue(
        style['stroke-linecap'],
        { butt: StrokeCap.Butt, round: StrokeCap.Round, square: StrokeCap.Square },
        'stroke-linecap',
      ),
      join: enumValue(
        style['stroke-linejoin'],
        { bevel: StrokeJoin.Bevel, miter: StrokeJoin.Miter, round: StrokeJoin.Round },
        'stroke-linejoin',
      ),
      miterLimit,
      width: width * STROKE_PRECISION_SCALE,
    })
    // Expand strokes before transforming, including non-uniform scale/skew.
    result.op(stroke.transform(compose(matrix, scale(1 / STROKE_PRECISION_SCALE))), PathOp.Union)
  }
  return result
}

function serializeIcon(dimensions, data) {
  const width = dimensions.width === undefined ? '' : ` width="${dimensions.width}"`
  const height = dimensions.height === undefined ? '' : ` height="${dimensions.height}"`
  return `<svg xmlns="http://www.w3.org/2000/svg"${width}${height} viewBox="${dimensions.viewBox.join(' ')}"><path fill="currentColor" d="${data}"/></svg>\n`
}

function svgSize(value) {
  const text = String(value).trim()
  if (
    !/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?(?:px|em|rem|ex|ch|cm|mm|in|pt|pc|%)?$/i.test(text) ||
    !Number.isFinite(parseFloat(text)) ||
    parseFloat(text) <= 0
  ) {
    throw new Error(`SVG width and height must be positive lengths: ${text}`)
  }
  return text
}

function validateAttributes(node) {
  for (const [name, value] of Object.entries(node.attributes)) {
    if (name === 'opacity' && length(value, name) !== 1) {
      throw new Error('Partial opacity cannot be represented in a monochrome icon font.')
    }
    if (ALLOWED_ATTRIBUTES.has(name) || /^(?:xmlns|data-|aria-)|:/.test(name)) {
      continue
    }
    if (
      ['clip-path', 'filter', 'marker-end', 'marker-mid', 'marker-start', 'mask', 'vector-effect'].includes(
        name,
      ) &&
      value === 'none'
    ) {
      continue
    }
    throw new Error(`Unsupported ${name} on <${node.name}>. Convert this feature to plain paths first.`)
  }
}

function validatePath(data) {
  const parsed = svgpath(data)
  if (parsed.err || parsed.segments.some((segment) => segment.slice(1).some((value) => !Number.isFinite(value)))) {
    throw new Error(`Invalid SVG path: ${parsed.err || 'non-finite coordinates'}`)
  }
  return parsed
}
