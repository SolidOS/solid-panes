export const IFRAME_PREVIEW_FRAME_NAME = 'solidos-iframe-preview'
export const HTML_PREVIEW_SANDBOX = 'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals'

const MOBILE_PREVIEW_STYLES = `
<style data-solidos-mobile-preview>
  @media (max-width: 768px) {
    html, body {
      width: 100%;
      min-width: 0 !important;
      max-width: 100%;
      overflow-x: hidden;
    }

    body {
      margin: 0 auto !important;
      padding: 0 0.75rem !important;
      box-sizing: border-box;
    }

    main, article {
      width: 100% !important;
      max-width: 100% !important;
      margin-left: auto !important;
      margin-right: auto !important;
      box-sizing: border-box;
    }

    img, video, svg, canvas, iframe, table {
      max-width: 100% !important;
    }

    pre, code {
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: break-word;
      white-space: pre-wrap;
    }

    table {
      display: block;
      overflow-x: auto;
    }
  }
</style>`

export function escapeAttribute (value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function addResponsivePreviewStyles (html: string): string {
  if (html.includes('data-solidos-mobile-preview')) return html
  const headMatch = html.match(/<head(\s[^>]*)?>[\s\S]*?<\/head\s*>/i)
  if (headMatch && headMatch.index !== undefined) {
    const closingHeadIndex = headMatch.index + headMatch[0].length - headMatch[0].match(/<\/head\s*>$/i)![0].length
    return html.slice(0, closingHeadIndex) + MOBILE_PREVIEW_STYLES + html.slice(closingHeadIndex)
  }
  return MOBILE_PREVIEW_STYLES + html
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
