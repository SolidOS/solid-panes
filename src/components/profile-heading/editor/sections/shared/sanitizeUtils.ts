import { sanitizeTextValue } from '../../textUtils'

export function sanitizeEmailValue (value: string): string {
  return sanitizeTextValue(value).replace(/\s+/g, '').toLowerCase()
}

export function sanitizePhoneLocalValue (value: string): string {
  return sanitizeTextValue(value).replace(/[^0-9()\-\s.]/g, '')
}

export function sanitizeAddressFieldValue (value: string): string {
  return sanitizeTextValue(value)
}

export function sanitizeBasicInputFieldValue (value: string): string {
  return sanitizeTextValue(value)
}
