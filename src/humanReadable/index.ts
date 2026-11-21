/*   Human-readable Pane
 **
 **  This outline pane contains the document contents for an HTML document
 **  This is for peeking at a page, because the user might not want to leave the data browser.
 */
import { icons, log, ns } from 'solid-ui'
import { Util } from 'rdflib'
import { authn } from 'solid-logic'
import type { DataBrowserContext, RenderEnvironment } from 'pane-registry'
import type { NamedNode } from 'rdflib'
import './humanReadablePane.css'
import { createPreviewBridge } from './previewBridge'
import { renderMarkdownContent } from './markdownPreview'
import { renderJsonContent } from './jsonPreview'
import { renderPlainTextContent } from './textPreview'
import { isDocxContentType, isDocxFile, renderDocxContent } from './docxPreview'
import {
  isImageContentType,
  isVideoContentType,
  renderImageContent,
  renderVideoContent
} from './mediaPreview'
import { createPreviewContainer } from './previewFrame'
import { escapeAttribute, HTML_PREVIEW_SANDBOX } from './previewHelpers'
import type IframePreview from '../components/iframe-preview'
import '../components/iframe-preview'
import type PdfViewer from '../components/pdf-viewer'
import '../components/pdf-viewer'

export { IFRAME_PREVIEW_FRAME_NAME } from './previewHelpers'

function viewerWebId (): string | null {
  try {
    return authn.currentUser()?.value ?? null
  } catch {
    return null
  }
}

// Helper function to check if a URI has a markdown file extension
type DokieliCacheValue = 'dokieli' | 'html'

type HumanReadableIcon = string | Promise<string>

type HumanReadablePaneDefinition = {
  icon: (subject: NamedNode, context: DataBrowserContext) => HumanReadableIcon
  name: string
  label: (subject: NamedNode, context: DataBrowserContext) => 'Webpage' | 'View' | null
  render: (subject: NamedNode, context: DataBrowserContext) => HTMLDivElement
}

const isMarkdownFile = (uri?: string | null): boolean => {
  if (!uri) return false
  const path = uri.split('?')[0].split('#')[0] // Remove query string and fragment
  return /\.(md|markdown|mdown|mkd|mkdn)$/i.test(path)
}

const isJsonFile = (uri?: string | null): boolean => {
  if (!uri) return false
  const path = uri.split('?')[0].split('#')[0]
  return /\.(json|jsonld)$/i.test(path)
}

const isJsonContentType = (contentType?: string | null): boolean =>
  contentType === 'application/json' || contentType === 'application/ld+json'

const canUseJsonExtensionFallback = (contentType?: string | null): boolean =>
  !contentType || contentType === 'application/octet-stream'

// Cache for dokieli detection results (keyed by subject URI)
const dokieliCache = new Map<string, DokieliCacheValue>()

const isDokieliHtml = (text: string): boolean =>
  text.includes('<script src="https://dokie.li/scripts/dokieli.js">') || text.includes('dokieli.css')

// srcdoc documents resolve relative URLs against about:srcdoc, so point them back at the resource.
export function withBaseHref (html: string, baseUri: string): string {
  const existingBase = html.match(/<base(\s[^>]*)?>/i)
  if (existingBase && existingBase.index !== undefined) {
    const href = existingBase[0].match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
    const existingHref = href?.[1] ?? href?.[2] ?? href?.[3]
    if (!href || existingHref === undefined) return html
    if (/^[a-z][a-z\d+.-]*:/i.test(existingHref) || existingHref.startsWith('//')) return html
    let resolvedHref: string
    try {
      resolvedHref = new URL(existingHref, baseUri).href
    } catch {
      return html
    }
    const resolvedBase = existingBase[0].replace(href[0], `href="${escapeAttribute(resolvedHref)}"`)
    return html.slice(0, existingBase.index) + resolvedBase + html.slice(existingBase.index + existingBase[0].length)
  }
  const base = `<base href="${escapeAttribute(baseUri)}">`
  const headMatch = html.match(/<head(\s[^>]*)?>/i)
  if (headMatch && headMatch.index !== undefined) {
    const insertAt = headMatch.index + headMatch[0].length
    return html.slice(0, insertAt) + base + html.slice(insertAt)
  }
  return base + html
}

type PreviewRequest = {
  type: 'solidos-preview-request'
  nonce: string
  id: string
  url: string
  method: string
  headers?: Record<string, string>
  body?: string
}

type PreviewResponse = {
  type: 'solidos-preview-response'
  nonce: string
  id: string
  ok: boolean
  status: number
  headers: Array<[string, string]>
  body: string
  error?: string
}

const PREVIEW_REQUEST_TYPE = 'solidos-preview-request'
const PREVIEW_RESPONSE_TYPE = 'solidos-preview-response'
const PREVIEW_BRIDGE_ATTRIBUTE = 'data-solidos-preview-bridge'
const PREVIEW_READ_METHODS = new Set(['GET', 'HEAD'])
const PREVIEW_WRITE_METHODS = new Set(['PUT', 'PATCH', 'DELETE'])

function stripPreviewBridgeScripts (html: string | undefined): string | undefined {
  if (typeof html !== 'string' || !html.includes(PREVIEW_REQUEST_TYPE)) return html

  const parsed = new DOMParser().parseFromString(html, 'text/html')
  let removed = false
  for (const script of parsed.querySelectorAll('script')) {
    const source = script.textContent || ''
    const isPreviewBridge = script.hasAttribute(PREVIEW_BRIDGE_ATTRIBUTE) ||
      (
        source.includes(PREVIEW_REQUEST_TYPE) &&
        source.includes(PREVIEW_RESPONSE_TYPE) &&
        source.includes('const pending = new Map()')
      )
    if (isPreviewBridge) {
      script.remove()
      removed = true
    }
  }
  if (!removed) return html

  const doctype = html.match(/<!doctype[^>]*>/i)?.[0]
  return `${doctype ? `${doctype}\n` : ''}${parsed.documentElement.outerHTML}`
}

function isSrcdocUrl (url: string): boolean {
  return url === 'about:srcdoc' || /^file:\/\/srcdoc\/?(?:[?#].*)?$/i.test(url)
}

export function previewRequestUrl (url: string, documentUri: string): string {
  const resolvedUrl = new URL(url, documentUri).href
  return isSrcdocUrl(resolvedUrl) ? documentUri : resolvedUrl
}

function profileDocumentUrl (webId: string | null | undefined): string | undefined {
  if (!webId) return undefined
  try {
    const url = new URL(webId)
    url.hash = ''
    return url.href
  } catch {
    return undefined
  }
}

export function isAllowedPreviewRequest (
  url: string,
  method: string,
  documentUri: string,
  webId: string | null = null
): boolean {
  let resolvedUrl: URL
  let expectedUrl: URL
  try {
    resolvedUrl = new URL(previewRequestUrl(url, documentUri))
    expectedUrl = new URL(documentUri)
  } catch {
    return false
  }

  if (resolvedUrl.origin !== expectedUrl.origin) {
    return false
  }

  const normalizedMethod = method.toUpperCase()
  const requestedDocument = new URL(resolvedUrl.href)
  requestedDocument.hash = ''
  const expectedDocument = new URL(expectedUrl.href)
  expectedDocument.hash = ''
  const isPreviewDocument = requestedDocument.href === expectedDocument.href
  const isExactPreviewDocument = resolvedUrl.href === expectedUrl.href
  // Path-based pods keep the viewer profile below the pod path, e.g. /alice/profile/card.
  const isApprovedProfileResource = resolvedUrl.pathname === '/profile/card' ||
    requestedDocument.href === profileDocumentUrl(webId)
  return (
    PREVIEW_READ_METHODS.has(normalizedMethod) &&
    (isPreviewDocument || isApprovedProfileResource)
  ) || (isExactPreviewDocument && PREVIEW_WRITE_METHODS.has(normalizedMethod))
}

function mountDokieliBridge (
  frame: HTMLIFrameElement,
  uri: string,
  html: string,
  authenticatedFetch: (url: string, init?: RequestInit) => Promise<Response>,
  webId: string | null = null
): () => void {
  const ownerWindow = frame.ownerDocument.defaultView
  if (!ownerWindow) return () => {}

  const randomValues = new Uint32Array(4)
  ownerWindow.crypto.getRandomValues(randomValues)
  const nonce = Array.from(randomValues, value => value.toString(16)).join('-')
  const expectedUri = new URL(uri).href
  const listener = (event: MessageEvent<PreviewRequest>) => {
    const request = event.data
    if (
      !frame.contentWindow ||
      event.source !== frame.contentWindow ||
      !request ||
      request.type !== PREVIEW_REQUEST_TYPE ||
      request.nonce !== nonce
    ) return

    const respond = (response: PreviewResponse) => {
      frame.contentWindow?.postMessage(response, '*')
    }

    // Always settle authenticated bridge requests. Dropping a denied request
    // leaves the preview awaiting it forever (Dokieli then never leaves Loading…).
    if (!isAllowedPreviewRequest(request.url, request.method, expectedUri, webId)) {
      respond({
        type: PREVIEW_RESPONSE_TYPE,
        nonce,
        id: request.id,
        ok: false,
        status: 403,
        headers: [],
        body: '',
        error: 'Request not permitted by the SolidOS preview'
      })
      return
    }
    const requestUrl = previewRequestUrl(request.url, expectedUri)

    authenticatedFetch(requestUrl, {
      method: request.method,
      headers: request.headers,
      body: PREVIEW_READ_METHODS.has(request.method)
        ? undefined
        : stripPreviewBridgeScripts(request.body)
    }).then(async response => {
      respond({
        type: PREVIEW_RESPONSE_TYPE,
        nonce,
        id: request.id,
        ok: response.ok,
        status: response.status,
        headers: Array.from(response.headers.entries()),
        body: await response.text()
      })
    }).catch(error => {
      respond({
        type: PREVIEW_RESPONSE_TYPE,
        nonce,
        id: request.id,
        ok: false,
        status: 0,
        headers: [],
        body: '',
        error: error instanceof Error ? error.message : String(error)
      })
    })
  }

  ownerWindow.addEventListener('message', listener)
  frame.setAttribute('sandbox', HTML_PREVIEW_SANDBOX)
  frame.srcdoc = createPreviewBridge(html, expectedUri, nonce, {
    bridgeAttribute: PREVIEW_BRIDGE_ATTRIBUTE,
    requestType: PREVIEW_REQUEST_TYPE,
    responseType: PREVIEW_RESPONSE_TYPE,
    readMethods: [...PREVIEW_READ_METHODS],
    writeMethods: [...PREVIEW_WRITE_METHODS],
    withBaseHref,
    stripPreviewBridgeScripts
  }, webId)
  return () => ownerWindow.removeEventListener('message', listener)
}

const humanReadablePane: HumanReadablePaneDefinition = {
  icon: function (subject: NamedNode, context: DataBrowserContext): HumanReadableIcon {
    // Markdown files detected by extension
    if (subject && isMarkdownFile(subject.uri)) {
      return icons.iconBase + 'markdown.svg'
    }

    // Dokieli files detected by content check
    if (subject) {
      const kb = context.session.store

      // Check cache from previous detection
      const cachedResult = dokieliCache.get(subject.uri)
      if (cachedResult === 'dokieli') {
        return icons.iconBase + 'dokieli-logo.png'
      } else if (cachedResult === 'html') {
        return icons.originalIconBase + 'tango/22-text-x-generic.png'
      }

      // Check if content already fetched (synchronous)
      const responseText = kb.fetcher.getHeader(subject.doc(), 'content')
      if (responseText && responseText.length > 0) {
        const text = responseText[0]
        const isDokieli = text.includes('<script src="https://dokie.li/scripts/dokieli.js">') ||
                         text.includes('dokieli.css')
        dokieliCache.set(subject.uri, isDokieli ? 'dokieli' : 'html')
        return isDokieli
          ? icons.iconBase + 'dokieli-logo.png'
          : icons.originalIconBase + 'tango/22-text-x-generic.png'
      }

      // Content not yet fetched - return a promise (async detection)
      const cts = kb.fetcher.getHeader(subject.doc(), 'content-type')
      const ct = cts ? cts[0].split(';', 1)[0].trim() : null

      if (ct === 'text/html') {
        return kb.fetcher._fetch(subject.uri)
          .then(response => response.text())
          .then(text => {
            const isDokieli = text.includes('<script src="https://dokie.li/scripts/dokieli.js">') ||
                             text.includes('dokieli.css')
            dokieliCache.set(subject.uri, isDokieli ? 'dokieli' : 'html')
            return isDokieli
              ? icons.iconBase + 'dokieli-logo.png'
              : icons.originalIconBase + 'tango/22-text-x-generic.png'
          })
          .catch(() => {
            dokieliCache.set(subject.uri, 'html')
            return icons.originalIconBase + 'tango/22-text-x-generic.png'
          })
      }
    }

    // Default for all other human-readable content
    return icons.originalIconBase + 'tango/22-text-x-generic.png'
  },

  name: 'humanReadable',

  label: function (
    subject: NamedNode,
    context: DataBrowserContext
  ): 'Webpage' | 'View' | null {
    const kb = context.session.store

    //   See also the source pane, which has lower precedence.

    const allowed = [
      'text/plain',
      'text/html',
      'text/markdown',
      'application/json',
      'application/ld+json',
      'application/xhtml+xml',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/',
      'video/',
      'application/pdf'
    ]

    const hasContentTypeIn = function (
      kb: typeof context.session.store,
      x: NamedNode,
      displayables: string[]
    ): boolean {
      const cts = kb.fetcher.getHeader(x, 'content-type')
      if (cts) {
        for (let j = 0; j < cts.length; j++) {
          for (let k = 0; k < displayables.length; k++) {
            if (cts[j].indexOf(displayables[k]) >= 0) {
              return true
            }
          }
        }
      }
      return false
    }

    // This data could come from a fetch OR from ldp container
    const hasContentTypeIn2 = function (
      kb: typeof context.session.store,
      x: NamedNode,
      displayables: string[]
    ): boolean {
      const t = kb.findTypeURIs(x)
      for (let k = 0; k < displayables.length; k++) {
        if (Util.mediaTypeClass(displayables[k]).uri in t) {
          return true
        }
      }
      return false
    }

    if (!subject.uri) return null // no bnodes

    const t = kb.findTypeURIs(subject)
    if (t[ns.link('WebPage').uri]) return 'Webpage'

    // Check file extension for markdown files
    if (isMarkdownFile(subject.uri)) {
      return 'View'
    }

    if (isDocxFile(subject.uri)) {
      return 'View'
    }

    const cts = kb.fetcher.getHeader(subject.doc(), 'content-type')
    const contentType = cts ? cts[0].split(';', 1)[0].trim() : null
    if (isJsonFile(subject.uri) &&
      (isJsonContentType(contentType) || canUseJsonExtensionFallback(contentType))) {
      return 'View'
    }

    if (
      hasContentTypeIn(kb, subject, allowed) ||
      hasContentTypeIn2(kb, subject, allowed)
    ) {
      // For HTML files, check if it's dokieli (async check, store result for later)
      const cts = kb.fetcher.getHeader(subject.doc(), 'content-type')
      const ct = cts ? cts[0].split(';', 1)[0].trim() : null

      if (ct === 'text/html' && !dokieliCache.has(subject.uri)) {
        // Async check for dokieli, don't wait for result
        kb.fetcher._fetch(subject.uri)
          .then(response => response.text())
          .then(text => {
            const isDokieli = text.includes('<script src="https://dokie.li/scripts/dokieli.js">') ||
                             text.includes('dokieli.css')
            dokieliCache.set(subject.uri, isDokieli ? 'dokieli' : 'html')
          })
          .catch(() => {
            dokieliCache.set(subject.uri, 'html')
          })
      }

      return 'View'
    }

    return null
  },

  render: function (
    subject: NamedNode,
    context: DataBrowserContext
  ): HTMLDivElement {
    const myDocument = context.dom
    const div = myDocument.createElement('div')
    const kb = context.session.store

    function applyEnvironmentAttributes (element: HTMLDivElement): void {
      const environment = (context.environment ?? {}) as Partial<RenderEnvironment>
      element.dataset.layout = environment.layout ?? 'desktop'
    }

    const cts = kb.fetcher.getHeader(subject.doc(), 'content-type')
    const ct = cts ? cts[0].split(';', 1)[0].trim() : null // remove content-type parameters

    // Fallback: detect markdown by file extension if content-type is not text/markdown
    const isMarkdown = ct === 'text/markdown' || isMarkdownFile(subject.uri)
    const isDocx = isDocxContentType(ct) || isDocxFile(subject.uri)
    const isImage = isImageContentType(ct)
    const isVideo = isVideoContentType(ct)
    const isJson = isJsonContentType(ct) ||
      (isJsonFile(subject.uri) && canUseJsonExtensionFallback(ct))
    const isPlainText = ct === 'text/plain'
    const isPdf = ct === 'application/pdf'

    if (ct) {
      // Unknown types are intentionally left to the browser fallback.
    } else {
      log.debug(`Human Readable: unknown content type ${ct}`)
    }

    //  @@ When we can, use CSP to turn off scripts within the iframe
    div.classList.add('human-readable-pane')
    applyEnvironmentAttributes(div)

    if (isImage || isVideo) {
      const frame = myDocument.createElement('div')
      const { container: frameContainer, status } = createPreviewContainer(myDocument, frame)
      if (isImage) {
        renderImageContent(kb, subject, frame, status)
      } else {
        renderVideoContent(kb, subject, frame, status)
      }
      div.appendChild(frameContainer)
      div.classList.add('human-readable-pane--document')
    } else if (isPdf) {
      const preview = myDocument.createElement('solid-panes-pdf-viewer') as PdfViewer
      preview.dataset.layout = context.environment?.layout ?? 'desktop'
      preview.store = kb
      preview.subject = subject
      div.appendChild(preview)
      div.classList.add('human-readable-pane--document')
    } else if (isDocx) {
      const frame = myDocument.createElement('div')
      const { container: frameContainer, status } = createPreviewContainer(myDocument, frame)
      renderDocxContent(kb, subject, frame, status)
      div.appendChild(frameContainer)
      div.classList.add('human-readable-pane--document')
    } else if (isMarkdown) {
      // For markdown, use a DIV element and render the content
      const frame = myDocument.createElement('div')
      const { container: frameContainer, status } = createPreviewContainer(myDocument, frame)
      renderMarkdownContent(kb, subject, frame, status)
      div.appendChild(frameContainer)
      div.classList.add('human-readable-pane--document')
    } else if (isJson) {
      const frame = myDocument.createElement('pre')
      frame.tabIndex = 0
      frame.setAttribute('aria-label', 'JSON document')
      const { container: frameContainer, status } = createPreviewContainer(myDocument, frame)
      renderJsonContent(kb, subject, frame, status)
      div.appendChild(frameContainer)
      div.classList.add('human-readable-pane--document')
    } else if (isPlainText) {
      // For plain text, use a PRE element and render the content
      const frame = myDocument.createElement('pre')
      frame.tabIndex = 0
      frame.setAttribute('aria-label', 'Plain text document')
      const { container: frameContainer, status } = createPreviewContainer(myDocument, frame)
      renderPlainTextContent(kb, subject, frame, status)
      div.appendChild(frameContainer)
      div.classList.add('human-readable-pane--document')
    } else {
      const preview = myDocument.createElement('solid-panes-iframe-preview') as IframePreview
      preview.store = kb
      preview.subject = subject
      preview.withBaseHref = withBaseHref
      preview.isDokieliHtml = isDokieliHtml
      preview.rememberHtmlType = (uri, isDokieli) => {
        dokieliCache.set(uri, isDokieli ? 'dokieli' : 'html')
      }
      preview.mountDokieliBridge = (frame, uri, html) => mountDokieliBridge(
        frame, uri, html, (url, init) => kb.fetcher._fetch(url, init), viewerWebId()
      )
      div.appendChild(preview)
      div.classList.add('human-readable-pane--iframe')
    }

    return div
  }
}

export default humanReadablePane
// ends
