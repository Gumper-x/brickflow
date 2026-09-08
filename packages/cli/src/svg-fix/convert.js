import { Path2D, StrokeCap, StrokeJoin } from '@napi-rs/canvas'
import { optimize } from 'svgo'
import svgpath from 'svgpath'
import { scale } from 'transformation-matrix'

const DEFAULT_STYLE = Object.freeze({
  color: '#000',
  fill: '#000',
  'fill-opacity': '1',
  stroke: 'none',
  'stroke-dasharray': 'none',
  'stroke-dashoffset': '0',
  'stroke-linecap': 'butt',
  'stroke-linejoin': 'miter',
  'stroke-miterlimit': '4',
  'stroke-opacity': '1',
  'stroke-width': '1',
})
const INHERITED_STYLE = new Set(Object.keys(DEFAULT_STYLE))
const SHAPES = new Set(['circle', 'ellipse', 'line', 'path', 'polygon', 'polyline', 'rect'])
const STROKE_ATTRIBUTES = new Set([
  'stroke',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-miterlimit',
  'stroke-opacity',
  'stroke-width',
])
const GEOMETRY_ATTRIBUTES = new Set([
  'cx',
  'cy',
  'height',
  'points',
  'r',
  'rx',
  'ry',
  'width',
  'x',
  'x1',
  'x2',
  'y',
  'y1',
  'y2',
])
const OUTLINE_CONTEXT_ATTRIBUTES = new Set([
  'clip-path',
  'display',
  'filter',
  'mask',
  'opacity',
  'transform',
  'visibility',
])
const STROKE_SCALE = 128

export class SvgFixError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`)
    this.code = code
    this.name = 'SvgFixError'
  }
}

/**
 * Expand visible strokes and leave every stroke-free SVG byte-for-byte intact.
 * Nodes without a computed stroke are never structurally or geometrically changed.
 */
export function convertSvg(source, options = {}) {
  const diagnostics = createDiagnostics(options.onDiagnostic)
  const descriptors = analyzeShapes(source)
  if (!descriptors.some(({ convert }) => convert)) {
    return source
  }

  const sourceShapes = collectSourceShapes(source)
  const tokens = scanShapeTokens(source)
  if (sourceShapes.length !== descriptors.length || tokens.length !== descriptors.length) {
    fatal('INVALID_SVG', 'Could not correlate parsed SVG elements with source tags.')
  }

  const replacements = []
  for (let index = 0; index < descriptors.length; index += 1) {
    const descriptor = descriptors[index]
    if (!descriptor.convert) {
      continue
    }
    const nodes = expandStrokeNode(sourceShapes[index], descriptor, diagnostics)
    replacements.push({
      end: tokens[index].end,
      start: tokens[index].start,
      value: nodes.map(serializeElement).join(''),
    })
  }
  return applyReplacements(source, replacements)
}

function analyzeShapes(source) {
  let document
  try {
    optimize(source, {
      plugins: [
        { name: 'inlineStyles', params: { onlyMatchedOnce: false } },
        'convertStyleToAttrs',
        {
          fn(root) {
            document = root
          },
          name: 'collect-computed-svg',
        },
      ],
    })
  } catch (error) {
    fatal('INVALID_SVG', error.message)
  }

  const descriptors = []
  collectShapeDescriptors(document, createStyleState(), descriptors)
  return descriptors
}

function applyReplacements(source, replacements) {
  let result = source
  for (const replacement of replacements.sort((first, second) => second.start - first.start)) {
    result = `${result.slice(0, replacement.start)}${replacement.value}${result.slice(replacement.end)}`
  }
  return result
}

function collectElements(node, callback) {
  if (node.type === 'element') {
    callback(node)
  }
  for (const child of node.children ?? []) {
    collectElements(child, callback)
  }
}

function collectShapeDescriptors(node, parentState, descriptors) {
  if (node.type !== 'element' && node.type !== 'root') {
    return
  }
  const state = node.type === 'element' ? computeStyle(node, parentState) : parentState
  if (node.type === 'element' && SHAPES.has(node.name)) {
    const strokeWidth = length(state.style['stroke-width'], 'stroke-width')
    const strokeOpacity = opacity(state.style['stroke-opacity'], 'stroke-opacity')
    const stroke = resolveVariables(state.style.stroke, state.variables).trim()
    descriptors.push({
      convert: strokeWidth > 0 && strokeOpacity > 0 && !['none', 'transparent'].includes(stroke.toLowerCase()),
      node,
      state,
      stroke,
      strokeOpacity,
      strokeWidth,
    })
  }
  for (const child of node.children ?? []) {
    collectShapeDescriptors(child, state, descriptors)
  }
}

function collectSourceShapes(source) {
  let document
  try {
    optimize(source, {
      plugins: [
        {
          fn(root) {
            document = root
          },
          name: 'collect-source-svg',
        },
      ],
    })
  } catch (error) {
    fatal('INVALID_SVG', error.message)
  }
  const shapes = []
  collectElements(document, (node) => {
    if (SHAPES.has(node.name)) {
      shapes.push(node)
    }
  })
  return shapes
}

function computeStyle(node, parentState) {
  const state = createStyleState(parentState)
  const declarations = parseStyle(node.attributes.style)
  for (const [name, value] of Object.entries(declarations)) {
    if (name.startsWith('--')) {
      state.variables[name] = resolveVariables(value, state.variables)
    }
  }
  for (const [name, value] of Object.entries(node.attributes)) {
    if (name.startsWith('--')) {
      state.variables[name] = resolveVariables(value, state.variables)
    }
  }
  for (const name of INHERITED_STYLE) {
    const rawValue = declarations[name] ?? node.attributes[name]
    if (rawValue !== undefined && rawValue !== 'inherit') {
      state.style[name] = resolveVariables(rawValue, state.variables)
    }
  }
  return state
}

function convertNodeToOutline(node, descriptor, data) {
  node.name = 'path'
  for (const name of GEOMETRY_ATTRIBUTES) {
    delete node.attributes[name]
  }
  removeStrokeAttributes(node)
  node.attributes.d = data
  node.attributes.style = outlineStyle(node.attributes.style, descriptor, false)
}

function createDiagnostics(callback) {
  return {
    emit(code, message, level = 'fix') {
      callback?.({ code, level, message })
    },
  }
}

function createOutlineNode(sourceNode, descriptor, data) {
  const attributes = { d: data }
  for (const [name, value] of Object.entries(descriptor.node.attributes)) {
    if (OUTLINE_CONTEXT_ATTRIBUTES.has(name)) {
      attributes[name] = value
    }
  }
  attributes.style = outlineStyle(undefined, descriptor, true)
  return { attributes, children: [], name: 'path', type: 'element' }
}

function createStyleState(parent) {
  return {
    style: { ...(parent?.style ?? DEFAULT_STYLE) },
    variables: { ...(parent?.variables ?? {}) },
  }
}

function curveFlatness([start, first, second, end]) {
  return Math.max(pointLineDistance(first, start, end), pointLineDistance(second, start, end))
}

function dashPath(path, pattern, offset) {
  const contours = flattenPath(path.toSVGString())
  const result = new Path2D()
  const cycle = pattern.reduce((sum, value) => sum + value, 0)
  let normalizedOffset = ((offset % cycle) + cycle) % cycle
  let patternIndex = 0
  while (normalizedOffset >= pattern[patternIndex] && pattern[patternIndex] > 0) {
    normalizedOffset -= pattern[patternIndex]
    patternIndex = (patternIndex + 1) % pattern.length
  }
  for (const points of contours) {
    let remaining = pattern[patternIndex] - normalizedOffset
    let drawing = patternIndex % 2 === 0
    let started = false
    for (let index = 1; index < points.length; index += 1) {
      let [x, y] = points[index - 1]
      const [endX, endY] = points[index]
      let distance = Math.hypot(endX - x, endY - y)
      while (distance > 1e-10) {
        if (remaining <= 1e-10) {
          patternIndex = (patternIndex + 1) % pattern.length
          remaining = pattern[patternIndex]
          drawing = patternIndex % 2 === 0
          started = false
          continue
        }
        const step = Math.min(distance, remaining)
        const ratio = step / distance
        const nextX = x + (endX - x) * ratio
        const nextY = y + (endY - y) * ratio
        if (drawing) {
          if (!started) {
            result.moveTo(x, y)
          }
          result.lineTo(nextX, nextY)
          started = true
        } else {
          started = false
        }
        x = nextX
        y = nextY
        distance -= step
        remaining -= step
      }
    }
  }
  return result
}

function disableStroke(node) {
  removeStrokeAttributes(node)
  node.attributes.style = setStyleProperties(node.attributes.style, { stroke: 'none!important' })
  return node
}

function enumValue(value, values, name) {
  if (!Object.hasOwn(values, value)) {
    fatal('INVALID_STYLE', `Unsupported ${name}: ${value}.`)
  }
  return values[value]
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function expandStrokeNode(node, descriptor, diagnostics) {
  if (node.children.length > 0) {
    fatal('INVALID_SVG', `Stroked <${node.name}> must not contain child content.`)
  }
  if (descriptor.node.attributes['vector-effect'] === 'non-scaling-stroke') {
    fatal('UNSUPPORTED_VECTOR_EFFECT', 'non-scaling-stroke cannot be converted without changing transforms.')
  }
  const geometry = shapePath(descriptor.node)
  const outline = strokeToPath(geometry, descriptor)
  const outlineData = normalizePathData(outline.toSVGString())
  if (!outlineData) {
    return [disableStroke(node)]
  }

  const fillVisible =
    !['none', 'transparent'].includes(descriptor.state.style.fill.toLowerCase()) &&
    opacity(descriptor.state.style['fill-opacity'], 'fill-opacity') > 0
  diagnostics.emit('STROKE_TO_PATH', `Expanded stroke on <${node.name}> without changing stroke-free elements.`)

  if (!fillVisible) {
    convertNodeToOutline(node, descriptor, outlineData)
    return [node]
  }

  disableStroke(node)
  return [node, createOutlineNode(node, descriptor, outlineData)]
}

function fatal(code, message) {
  throw new SvgFixError(code, message)
}

function findTagEnd(source, start) {
  let quote
  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index]
    if (quote) {
      if (character === quote) {
        quote = undefined
      }
    } else if (character === '"' || character === "'") {
      quote = character
    } else if (character === '>') {
      return index
    }
  }
  fatal('INVALID_SVG', `Unclosed tag at source offset ${start}.`)
}

function flattenCubic(from, control1, control2, to, output, depth = 0) {
  if (depth >= 12 || curveFlatness([from, control1, control2, to]) <= 0.0025) {
    output.push(to)
    return
  }
  const a = midpoint(from, control1)
  const b = midpoint(control1, control2)
  const c = midpoint(control2, to)
  const d = midpoint(a, b)
  const e = midpoint(b, c)
  const middle = midpoint(d, e)
  flattenCubic(from, a, d, middle, output, depth + 1)
  flattenCubic(middle, e, c, to, output, depth + 1)
}

function flattenPath(data) {
  const parsed = validatePath(data).abs().unshort().unarc()
  const contours = []
  let points = []
  let current = [0, 0]
  let start = [0, 0]
  const addPoint = (point) => {
    if (!points.length || Math.hypot(point[0] - points.at(-1)[0], point[1] - points.at(-1)[1]) > 1e-10) {
      points.push(point)
    }
  }
  for (const segment of parsed.segments) {
    const command = segment[0]
    if (command === 'M') {
      if (points.length > 1) {
        contours.push(points)
      }
      current = [segment[1], segment[2]]
      start = current
      points = [current]
    } else if (command === 'L') {
      current = [segment[1], segment[2]]
      addPoint(current)
    } else if (command === 'C') {
      const to = [segment[5], segment[6]]
      flattenCubic(current, [segment[1], segment[2]], [segment[3], segment[4]], to, points)
      current = to
    } else if (command === 'Q') {
      const to = [segment[3], segment[4]]
      flattenQuadratic(current, [segment[1], segment[2]], to, points)
      current = to
    } else if (command === 'Z') {
      addPoint(start)
      current = start
    }
  }
  if (points.length > 1) {
    contours.push(points)
  }
  return contours
}

function flattenQuadratic(from, control, to, output) {
  const control1 = [from[0] + (2 / 3) * (control[0] - from[0]), from[1] + (2 / 3) * (control[1] - from[1])]
  const control2 = [to[0] + (2 / 3) * (control[0] - to[0]), to[1] + (2 / 3) * (control[1] - to[1])]
  flattenCubic(from, control1, control2, to, output)
}

function formatNumber(number) {
  return String(Number(number.toFixed(4)))
}

function length(value, name) {
  const text = String(value).trim()
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?(?:px)?$/i.test(text)) {
    fatal('INVALID_LENGTH', `${name} must be a number or px length, got "${text}".`)
  }
  const result = Number(text.replace(/px$/i, ''))
  if (!Number.isFinite(result)) {
    fatal('INVALID_LENGTH', `${name} is not finite.`)
  }
  return result
}

function midpoint(first, second) {
  return [(first[0] + second[0]) / 2, (first[1] + second[1]) / 2]
}

function normalizePathData(data) {
  if (!data) {
    return ''
  }
  return validatePath(data)
    .abs()
    .unshort()
    .unarc()
    .round(4)
    .toString()
    .replace(/-0(?:\.0+)?(?=[\s,]|$)/g, '0')
}

function numberList(value, name) {
  const text = String(value).trim()
  if (!text) {
    return []
  }
  return text.split(/[\s,]+/).map((item) => length(item, name))
}

function opacity(value, name) {
  const text = String(value).trim()
  const result = text.endsWith('%') ? Number.parseFloat(text) / 100 : length(text, name)
  if (!Number.isFinite(result) || result < 0 || result > 1) {
    fatal('INVALID_STYLE', `${name} must be between 0 and 1.`)
  }
  return result
}

function outlineStyle(currentStyle, descriptor, copyLocalColor) {
  const properties = {
    fill: `${descriptor.stroke}!important`,
    'fill-opacity': `${formatNumber(descriptor.strokeOpacity)}!important`,
    stroke: 'none!important',
  }
  if (
    copyLocalColor &&
    descriptor.stroke.toLowerCase() === 'currentcolor' &&
    descriptor.node.attributes.color !== undefined
  ) {
    properties.color = `${descriptor.state.style.color}!important`
  }
  return setStyleProperties(currentStyle, properties, new Set([...STROKE_ATTRIBUTES, 'fill', 'fill-opacity']))
}

function parseDashArray(value) {
  if (!value || value === 'none') {
    return null
  }
  const dash = numberList(value, 'stroke-dasharray')
  if (dash.length === 0 || dash.some((number) => number < 0) || dash.every((number) => number === 0)) {
    fatal('INVALID_STROKE', 'stroke-dasharray needs non-negative lengths and at least one positive length.')
  }
  if (dash.length % 2 === 1) {
    dash.push(...dash)
  }
  return dash
}

function parseStyle(value) {
  return Object.fromEntries(parseStyleEntries(value))
}

function parseStyleEntries(value) {
  if (!value) {
    return []
  }
  const entries = []
  for (const declaration of value.split(';')) {
    if (!declaration.trim()) {
      continue
    }
    const separator = declaration.indexOf(':')
    if (separator < 1) {
      fatal('INVALID_STYLE', `Invalid style declaration: ${declaration}`)
    }
    entries.push([declaration.slice(0, separator).trim(), declaration.slice(separator + 1).trim()])
  }
  return entries
}

function pointLineDistance(point, start, end) {
  const lineLength = Math.hypot(end[0] - start[0], end[1] - start[1])
  if (lineLength === 0) {
    return Math.hypot(point[0] - start[0], point[1] - start[1])
  }
  return (
    Math.abs(
      (end[1] - start[1]) * point[0] - (end[0] - start[0]) * point[1] + end[0] * start[1] - end[1] * start[0],
    ) / lineLength
  )
}

function removeStrokeAttributes(node) {
  for (const name of STROKE_ATTRIBUTES) {
    delete node.attributes[name]
  }
}

function resolveVariables(value, variables, stack = []) {
  if (typeof value !== 'string' || !value.includes('var(')) {
    return value
  }
  let changed = false
  const result = value.replace(/var\(([^()]*)\)/g, (_, body) => {
    const [rawName, ...fallbackParts] = body.split(',')
    const name = rawName.trim()
    const fallback = fallbackParts.length ? fallbackParts.join(',').trim() : undefined
    if (!/^--[\w-]+$/.test(name)) {
      fatal('INVALID_STYLE', `Invalid CSS variable name: ${name}.`)
    }
    if (stack.includes(name)) {
      fatal('INVALID_STYLE', `Circular CSS variable ${name}.`)
    }
    const replacement = variables[name] ?? fallback
    if (replacement === undefined) {
      fatal('INVALID_STYLE', `CSS variable ${name} has no value or fallback.`)
    }
    changed = true
    return resolveVariables(replacement.trim(), variables, [...stack, name])
  })
  if (result.includes('var(') && !changed) {
    fatal('INVALID_STYLE', `Unsupported CSS variable expression: ${value}`)
  }
  return result.includes('var(') ? resolveVariables(result, variables, stack) : result
}

function scanShapeTokens(source) {
  const shapes = []
  const stack = []
  let cursor = 0
  while (cursor < source.length) {
    const start = source.indexOf('<', cursor)
    if (start < 0) {
      break
    }
    if (source.startsWith('<!--', start)) {
      cursor = skipMarkup(source, start, '-->')
      continue
    }
    if (source.startsWith('<![CDATA[', start)) {
      cursor = skipMarkup(source, start, ']]>')
      continue
    }
    if (source.startsWith('<?', start)) {
      cursor = skipMarkup(source, start, '?>')
      continue
    }
    if (source.startsWith('<!', start)) {
      cursor = findTagEnd(source, start) + 1
      continue
    }

    const tagEnd = findTagEnd(source, start)
    const tagSource = source.slice(start, tagEnd + 1)
    const closing = /^<\s*\//.test(tagSource)
    const name = tagSource.match(/^<\s*(?:\/\s*)?([\w:.-]+)/)?.[1]
    if (!name) {
      fatal('INVALID_SVG', `Cannot parse tag at source offset ${start}.`)
    }
    if (closing) {
      const opened = stack.pop()
      if (!opened || opened.name !== name) {
        fatal('INVALID_SVG', `Unexpected closing tag </${name}>.`)
      }
      opened.end = tagEnd + 1
    } else {
      const selfClosing = /\/\s*>$/.test(tagSource)
      const token = { end: selfClosing ? tagEnd + 1 : undefined, name, start }
      if (SHAPES.has(name)) {
        shapes.push(token)
      }
      if (!selfClosing) {
        stack.push(token)
      }
    }
    cursor = tagEnd + 1
  }
  if (stack.length > 0 || shapes.some(({ end }) => end === undefined)) {
    fatal('INVALID_SVG', 'SVG contains unclosed elements.')
  }
  return shapes
}

function serializeElement(node) {
  const attributes = Object.entries(node.attributes)
    .map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
    .join('')
  return `<${node.name}${attributes}/>`
}

function setStyleProperties(style, properties, removed = STROKE_ATTRIBUTES) {
  const declarations = parseStyleEntries(style).filter(([name]) => !removed.has(name))
  for (const [name, value] of Object.entries(properties)) {
    declarations.push([name, value])
  }
  return declarations.map(([name, value]) => `${name}:${value}`).join(';')
}

function shapePath(node) {
  const attributes = node.attributes
  const number = (name, fallback = 0) => length(attributes[name] ?? fallback, name)
  const result = new Path2D()
  switch (node.name) {
    case 'circle':
    case 'ellipse': {
      const radiusX = node.name === 'circle' ? number('r') : number('rx')
      const radiusY = node.name === 'circle' ? radiusX : number('ry')
      if (radiusX < 0 || radiusY < 0) {
        fatal('INVALID_PATH', 'Ellipse radii cannot be negative.')
      }
      if (radiusX > 0 && radiusY > 0) {
        result.ellipse(number('cx'), number('cy'), radiusX, radiusY, 0, 0, Math.PI * 2)
        result.closePath()
      }
      return result
    }
    case 'line':
      result.moveTo(number('x1'), number('y1'))
      result.lineTo(number('x2'), number('y2'))
      return result
    case 'path':
      validatePath(attributes.d ?? '')
      return new Path2D(attributes.d ?? '')
    case 'polygon':
    case 'polyline': {
      const values = numberList(attributes.points ?? '', 'points')
      if (values.length % 2 !== 0) {
        fatal('INVALID_PATH', 'points must contain coordinate pairs.')
      }
      for (let index = 0; index < values.length; index += 2) {
        if (index === 0) {
          result.moveTo(values[index], values[index + 1])
        } else {
          result.lineTo(values[index], values[index + 1])
        }
      }
      if (node.name === 'polygon' && values.length >= 4) {
        result.closePath()
      }
      return result
    }
    case 'rect': {
      const x = number('x')
      const y = number('y')
      const width = number('width')
      const height = number('height')
      if (width < 0 || height < 0) {
        fatal('INVALID_PATH', 'Rectangle dimensions cannot be negative.')
      }
      if (width === 0 || height === 0) {
        return result
      }
      const radiusX = Math.min(number('rx', attributes.ry ?? 0), width / 2)
      const radiusY = Math.min(number('ry', attributes.rx ?? 0), height / 2)
      if (radiusX < 0 || radiusY < 0) {
        fatal('INVALID_PATH', 'Rectangle radii cannot be negative.')
      }
      if (radiusX === 0 || radiusY === 0) {
        result.rect(x, y, width, height)
      } else {
        return new Path2D(
          `M${x + radiusX} ${y}H${x + width - radiusX}A${radiusX} ${radiusY} 0 0 1 ${x + width} ${y + radiusY}V${y + height - radiusY}A${radiusX} ${radiusY} 0 0 1 ${x + width - radiusX} ${y + height}H${x + radiusX}A${radiusX} ${radiusY} 0 0 1 ${x} ${y + height - radiusY}V${y + radiusY}A${radiusX} ${radiusY} 0 0 1 ${x + radiusX} ${y}Z`,
        )
      }
      return result
    }
    default:
      return result
  }
}

function skipMarkup(source, start, terminator) {
  const end = source.indexOf(terminator, start + 2)
  if (end < 0) {
    fatal('INVALID_SVG', `Unclosed XML markup at source offset ${start}.`)
  }
  return end + terminator.length
}

function strokeToPath(path, descriptor) {
  const style = descriptor.state.style
  const miterLimit = length(style['stroke-miterlimit'], 'stroke-miterlimit')
  if (miterLimit < 1) {
    fatal('INVALID_STROKE', 'stroke-miterlimit must be at least 1.')
  }
  const options = {
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
    width: descriptor.strokeWidth * STROKE_SCALE,
  }

  let stroke = new Path2D(path).transform(scale(STROKE_SCALE))
  const dash = parseDashArray(style['stroke-dasharray'])
  if (dash) {
    const offset = length(style['stroke-dashoffset'], 'stroke-dashoffset')
    if (dash.length > 2) {
      stroke = dashPath(path, dash, offset).transform(scale(STROKE_SCALE))
    } else {
      stroke.dash(dash[0] * STROKE_SCALE, dash[1] * STROKE_SCALE, offset * STROKE_SCALE)
    }
  }
  stroke.stroke(options)
  return stroke
    .transform(scale(1 / STROKE_SCALE))
    .simplify()
    .asWinding()
}

function validatePath(data) {
  const parsed = svgpath(data)
  if (parsed.err || parsed.segments.some((segment) => segment.slice(1).some((value) => !Number.isFinite(value)))) {
    fatal('INVALID_PATH', parsed.err || 'Path contains non-finite coordinates.')
  }
  return parsed
}
