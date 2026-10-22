/*   Human-readable Pane
 **
 **  This outline pane contains the document contents for an HTML document
 **  This is for peeking at a page, because the user might not want to leave the data browser.
 */
import { icons, ns } from 'solid-ui'
import { Util } from 'rdflib'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { DataBrowserContext, RenderEnvironment } from 'pane-registry'
import type { NamedNode } from 'rdflib'
import './humanReadablePane.css'

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

// Cache for dokieli detection results (keyed by subject URI)
const dokieliCache = new Map<string, DokieliCacheValue>()

function applyFrameClasses (
  frame: HTMLElement,
  modifier: 'markdown' | 'plain-text' | 'iframe',
  lines?: number
): void {
  frame.className = ''
  frame.classList.add('human-readable-pane__frame')
  frame.classList.add(`human-readable-pane__frame--${modifier}`)
  if (lines !== undefined) {
    frame.style.setProperty('--human-readable-pane-height', `${lines}em`)
  }
}

// window.name of preview iframes; initMainPage refuses to boot SolidOS inside such a frame.
export const HUMAN_READABLE_PREVIEW_FRAME_NAME = 'solidos-human-readable-preview'

// Scripts may run but get an opaque origin, so previewed pages cannot reach the SolidOS session.
const HTML_PREVIEW_SANDBOX = 'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals'

const isDokieliHtml = (text: string): boolean =>
  text.includes('<script src="https://dokie.li/scripts/dokieli.js">') || text.includes('dokieli.css')

function escapeAttribute (value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// srcdoc documents resolve relative URLs against about:srcdoc, so point them back at the resource.
export function withBaseHref (html: string, baseUri: string): string {
  if (/<base[\s>]/i.test(html)) return html
  const base = `<base href="${escapeAttribute(baseUri)}">`
  const headMatch = html.match(/<head(\s[^>]*)?>/i)
  if (headMatch && headMatch.index !== undefined) {
    const insertAt = headMatch.index + headMatch[0].length
    return html.slice(0, insertAt) + base + html.slice(insertAt)
  }
  return base + html
}

type AuthenticatedFetch = (url: string, init?: RequestInit) => Promise<Response>

async function toPlainRequest (input: unknown, init?: RequestInit): Promise<[string, RequestInit | undefined]> {
  // Requests built inside the frame belong to another realm, so copy them into plain values.
  if (input && typeof input === 'object' && 'url' in input && 'method' in input) {
    const request = input as Request
    const method = request.method
    const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer()
    return [request.url, { method, headers: Array.from(request.headers.entries()), body, ...init }]
  }
  return [String(input), init]
}

/*
 * Dokieli is an application that runs as the document itself: it takes the document URL from
 * window.location and saves back with fetch. A private document cannot be loaded into the frame
 * by URL (navigations carry no Solid credentials), so the authenticated content is written into a
 * same-origin frame whose URL is then set to the document, and requests to the document's origin
 * use the SolidOS session. Returns false when the document is on another origin.
 */
export function mountDokieliDocument (
  frame: HTMLIFrameElement,
  uri: string,
  html: string,
  authenticatedFetch: AuthenticatedFetch
): boolean {
  const ownerWindow = frame.ownerDocument.defaultView
  let documentOrigin: string
  try {
    documentOrigin = new URL(uri).origin
  } catch {
    return false
  }
  if (!ownerWindow || documentOrigin !== ownerWindow.location.origin) return false

  frame.removeAttribute('sandbox')
  frame.removeAttribute('srcdoc')

  const write = () => {
    const frameWindow = frame.contentWindow as (Window & typeof globalThis) | null
    const frameDocument = frame.contentDocument
    if (!frameWindow || !frameDocument) return
    frameDocument.open()
    try {
      frameWindow.history.replaceState(null, '', uri)
    } catch (error) {
      console.error('Cannot give the Dokieli frame its document URL; showing a preview instead.', error)
      frameDocument.close()
      frame.setAttribute('sandbox', HTML_PREVIEW_SANDBOX)
      frame.srcdoc = withBaseHref(html, uri)
      return
    }
    const nativeFetch = frameWindow.fetch?.bind(frameWindow) ?? ownerWindow.fetch.bind(ownerWindow)
    frameWindow.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const [url, plainInit] = await toPlainRequest(input, init)
      return new URL(url, uri).origin === documentOrigin
        ? authenticatedFetch(new URL(url, uri).href, plainInit)
        : nativeFetch(input, init)
    }
    frameDocument.write(html)
    frameDocument.close()
  }

  if (frame.isConnected && frame.contentDocument) {
    write()
  } else {
    frame.addEventListener('load', write, { once: true })
  }
  return true
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
      'application/xhtml+xml',
      'application/pdf',
      'video/mp4'
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
    const isPlainText = ct === 'text/plain'

    if (ct) {
      // console.log('humanReadablePane: c-t:' + ct)
    } else {
      console.log('humanReadablePane: unknown content-type?')
    }

    //  @@ When we can, use CSP to turn off scripts within the iframe
    div.classList.add('human-readable-pane')
    applyEnvironmentAttributes(div)

    // render markdown to html in a DIV element
    const renderMarkdownContent = function (frame: HTMLDivElement) {
      kb.fetcher.webOperation('GET', subject.uri).then(response => {
        const markdownText = response.responseText ?? ''
        const lines = Math.min(30, markdownText.split(/\n/).length + 5)
        const res = marked.parse(markdownText, { async: false })
        const clean = DOMPurify.sanitize(res)
        frame.innerHTML = clean
        applyFrameClasses(frame, 'markdown', lines)
      }).catch(error => {
        console.error('Error fetching markdown content:', error)
        frame.innerHTML = '<p>Error loading content</p>'
      })
    }

    // render plain text in a PRE element
    const renderPlainTextContent = function (frame: HTMLPreElement) {
      kb.fetcher.webOperation('GET', subject.uri).then(response => {
        const plainText = response.responseText ?? ''
        const lines = Math.min(30, plainText.split(/\n/).length + 5)
        frame.textContent = plainText
        applyFrameClasses(frame, 'plain-text', lines)
      }).catch(error => {
        console.error('Error fetching plain text content:', error)
        frame.textContent = 'Error loading content'
      })
    }

    if (isMarkdown) {
      // For markdown, use a DIV element and render the content
      const frame = myDocument.createElement('div')
      renderMarkdownContent(frame)
      const frameContainer = myDocument.createElement('div')
      frameContainer.classList.add('human-readable-pane__container')
      frameContainer.appendChild(frame)
      div.appendChild(frameContainer)
    } else if (isPlainText) {
      // For plain text, use a PRE element and render the content
      const frame = myDocument.createElement('pre')
      renderPlainTextContent(frame)
      const frameContainer = myDocument.createElement('div')
      frameContainer.classList.add('human-readable-pane__container')
      frameContainer.appendChild(frame)
      div.appendChild(frameContainer)
    } else {
      // For other content types, use IFRAME.
      // The iframe's own request would be anonymous (Solid auth is not cookie based), so the
      // content is fetched with the authenticated fetcher and handed to the frame directly.
      const frame = myDocument.createElement('iframe')
      frame.name = HUMAN_READABLE_PREVIEW_FRAME_NAME
      frame.title = decodeURIComponent(subject.uri.split('/').pop() || subject.uri)
      applyFrameClasses(frame, 'iframe')
      const isHtml = ct === 'text/html' || ct === 'application/xhtml+xml'

      const showError = (message: string) => {
        frame.removeAttribute('src')
        frame.setAttribute('sandbox', '')
        frame.srcdoc = `<p style="font-family: sans-serif">${escapeAttribute(message)}</p>`
      }

      if (isHtml) {
        kb.fetcher.webOperation('GET', subject.uri).then(response => {
          const html = response.responseText ?? ''
          const isDokieli = isDokieliHtml(html)
          dokieliCache.set(subject.uri, isDokieli ? 'dokieli' : 'html')
          if (isDokieli && mountDokieliDocument(frame, subject.uri, html, (url, init) => kb.fetcher._fetch(url, init))) {
            return
          }
          frame.setAttribute('sandbox', HTML_PREVIEW_SANDBOX)
          frame.srcdoc = withBaseHref(html, subject.uri)
        }).catch(error => {
          console.error('Error fetching HTML content:', error)
          showError('Error loading content')
        })
      } else {
        kb.fetcher._fetch(subject.uri).then(async response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          frame.src = URL.createObjectURL(await response.blob())
        }).catch(error => {
          console.error('Error fetching content:', error)
          showError('Error loading content')
        })
      }

      const frameContainer = myDocument.createElement('div')
      frameContainer.classList.add('human-readable-pane__container')
      frameContainer.classList.add('human-readable-pane__container--iframe')
      frameContainer.appendChild(frame)
      div.appendChild(frameContainer)
      div.classList.add('human-readable-pane--iframe')
    }

    return div
  }
}

export default humanReadablePane
// ends
