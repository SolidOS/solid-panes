function stringifyUnknown (value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Error) return value.message || value.name
  if (value == null) return ''

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function formatDisplayError (error: unknown, fallbackMessage?: string): string {
  return (fallbackMessage || stringifyUnknown(error) || 'Something went wrong.').trim()
}
