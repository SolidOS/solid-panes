export function createUiIcon (
  icon: string,
  label = 'icon',
  color: string = 'currentColor'
): string {
  const styleBlocks = ['display:block']

  const extraAttrs = [
    'role="img"',
    `aria-label="${label}"`,
    'focusable="false"',
    'aria-hidden="true"',
    'width="100%"',
    'height="100%"',
    `style="${styleBlocks.join('; ')}"`,
  ].join(' ')

  let svg = icon.replace(/^\uFEFF/, '').trim()

  // If webpack gave us a data URL instead of raw SVG, decode it first
  if (svg.startsWith('data:image/svg+xml;base64,')) {
    svg = decodeURIComponent(escape(atob(svg.slice('data:image/svg+xml;base64,'.length))))
  } else if (svg.startsWith('data:image/svg+xml,')) {
    svg = decodeURIComponent(svg.slice('data:image/svg+xml,'.length))
  }

  if (color) {
    svg = svg.replace(/\bcurrentColor\b/gi, color)
  }

  svg = svg.replace(/^(<svg\b)/i, `$1 ${extraAttrs}`)

  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
}
