export const IFRAME_PREVIEW_FRAME_NAME = 'solidos-iframe-preview'
export const HTML_PREVIEW_SANDBOX = 'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals'

export function escapeAttribute (value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function resourceFilename (uri: string): string {
  const encodedFilename = uri.split('/').pop() || uri
  try {
    return decodeURIComponent(encodedFilename)
  } catch {
    return encodedFilename
  }
}

export function documentTitle (html: string, uri: string): string {
  const fallback = resourceFilename(uri)
  try {
    const title = new DOMParser().parseFromString(html, 'text/html').querySelector('title')?.textContent?.trim()
    return title || fallback
  } catch {
    return fallback
  }
}
