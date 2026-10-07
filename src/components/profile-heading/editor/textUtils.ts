export function strToUpperCase (str: string) {
  if (str.trim().length > 0) {
    const strCase = str.split(' ')
    for (let i = 0; i < strCase.length; i++) {
      strCase[i] = strCase[i].charAt(0).toUpperCase() +
        strCase[i].substring(1)
    }
    return strCase.join(' ')
  }
  return ''
}

export function toText (value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
    const nested = (value as { value?: unknown }).value
    return typeof nested === 'string' ? nested : ''
  }
  return ''
}

export function toTypeLabel (value: unknown): string {
  const raw = toText(value).trim()
  if (!raw) return ''
  const withoutAngles = raw.replace(/^<|>$/g, '')
  const hashParts = withoutAngles.split('#')
  const lastByHash = hashParts[hashParts.length - 1]
  const slashParts = lastByHash.split('/')
  return slashParts[slashParts.length - 1]
}

export function sanitizeTextValue (value: string): string {
  return value
    // Control characters must be removed from user-entered profile values.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function hasNonEmptyText (value: string | undefined): boolean {
  return Boolean(value && value.trim() !== '')
}
