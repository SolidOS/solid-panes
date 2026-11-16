function normalizeDmy (value: string): string {
  const dmyMatch = value.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/)
  if (!dmyMatch) return ''

  const [, day, month, year] = dmyMatch
  return `${day}-${month}-${year}`
}

export function toDisplayDateDMY (value: string | undefined, emptyFallback = ''): string {
  const raw = (value || '').trim()
  if (!raw) return emptyFallback

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (isoMatch) {
    const [, year, month, day] = isoMatch
    return `${day}-${month}-${year}`
  }

  const normalizedDmy = normalizeDmy(raw)
  if (normalizedDmy) return normalizedDmy

  return raw
}

export function toEditableDateDMY (value: string | undefined): string {
  const raw = (value || '').trim()
  if (!raw) return ''

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    const [, year, month, day] = isoMatch
    return `${day}-${month}-${year}`
  }

  return normalizeDmy(raw)
}

export function toStorageDateISO (value: string | undefined): string {
  const raw = (value || '').trim()
  if (!raw) return ''

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) return raw

  const dmyMatch = raw.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/)
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch
    return `${year}-${month}-${day}`
  }

  return ''
}
