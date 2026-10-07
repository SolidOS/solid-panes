import { toTypeLabel } from '../../textUtils'

export function normalizePhoneTypeForEdit (value: unknown): string {
  const label = toTypeLabel(value).trim().toLowerCase()
  if (!label) return ''

  if (label === 'cell' || label === 'mobile') return 'Mobile'
  if (label === 'home') return 'Home'
  if (label === 'work' || label === 'office') return 'Work'
  return ''
}

export function normalizePhoneTypeForContactInfoEdit (value: unknown): string {
  const label = toTypeLabel(value).trim().toLowerCase()
  if (!label) return ''

  if (label === 'cell' || label === 'mobile') return 'Cell'
  if (label === 'home') return 'Home'
  if (label === 'work' || label === 'office') return 'Work'
  return ''
}

export function normalizeEmailTypeForEdit (value: unknown): string {
  const label = toTypeLabel(value).trim().toLowerCase()
  if (!label) return ''

  if (label === 'personal' || label === 'home') return 'Personal'
  if (label === 'office' || label === 'work') return 'Office'
  return ''
}

export function normalizeEmailTypeForContactInfoEdit (value: unknown): string {
  const label = toTypeLabel(value).trim().toLowerCase()
  if (!label) return ''

  if (label === 'personal' || label === 'home') return 'Home'
  if (label === 'office' || label === 'work') return 'Office'
  return ''
}

export function toSavedHeadingEmailType (type: string | undefined): string {
  return type === 'Personal' ? 'Home' : (type || '')
}

export function toSavedHeadingPhoneType (type: string | undefined): string {
  return type === 'Mobile' ? 'Cell' : (type || '')
}
