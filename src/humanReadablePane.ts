/*   Human-readable Pane
 **
 **  This outline pane contains the document contents for an HTML document
 **  This is for peeking at a page, because the user might not want to leave the data browser.
 */
import { icons, ns } from 'solid-ui'
import { Util } from 'rdflib'
import { authn } from 'solid-logic'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { DataBrowserContext, RenderEnvironment } from 'pane-registry'
import type { NamedNode } from 'rdflib'
import './humanReadablePane.css'

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
  return /\.json$/i.test(path)
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
    frame.style.setProperty('--human-readable-pane-height', `${lines * 16}px`)
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

function withPreviewResizeScript (html: string): string {
  const script = `<script>
(() => {
  const style = document.createElement('style')
  style.textContent = 'html, body { height: auto !important; min-height: 0 !important; max-height: none !important; overflow: visible !important; }'
  document.head?.appendChild(style)
  const reportHeight = () => {
    const elements = Array.from(document.querySelectorAll('*'))
    const height = Math.max(
      document.documentElement.scrollHeight,
      document.body ? document.body.scrollHeight : 0,
      ...elements.map(element => Math.max(
        element.scrollHeight,
        Math.ceil(element.getBoundingClientRect().bottom + window.scrollY)
      ))
    )
    window.parent.postMessage({ type: 'solidos-preview-size', height }, '*')
  }
  window.addEventListener('load', reportHeight)
  new ResizeObserver(reportHeight).observe(document.documentElement)
  document.addEventListener('DOMContentLoaded', () => {
    if (document.body) new ResizeObserver(reportHeight).observe(document.body)
    new MutationObserver(reportHeight).observe(document.body || document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true
    })
    reportHeight()
  })
  window.setInterval(reportHeight, 500)
  reportHeight()
})()
</script>`
  const withScript = html.replace(/<\/body\s*>/i, `${script}$&`)
  return withScript === html ? `${html}${script}` : withScript
}

function resourceFilename (uri: string): string {
  const encodedFilename = uri.split('/').pop() || uri
  try {
    return decodeURIComponent(encodedFilename)
  } catch {
    return encodedFilename
  }
}

function documentTitle (html: string, uri: string): string {
  const fallback = resourceFilename(uri)
  try {
    const title = new DOMParser().parseFromString(html, 'text/html').querySelector('title')?.textContent?.trim()
    return title || fallback
  } catch {
    return fallback
  }
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
const PREVIEW_READ_METHODS = new Set(['GET', 'HEAD'])
const PREVIEW_WRITE_METHODS = new Set(['PUT', 'PATCH', 'DELETE'])

function isSrcdocUrl (url: string): boolean {
  return url === 'about:srcdoc' || /^file:\/\/srcdoc\/?(?:[?#].*)?$/i.test(url)
}

export function previewRequestUrl (url: string, documentUri: string): string {
  const resolvedUrl = new URL(url, documentUri).href
  return isSrcdocUrl(resolvedUrl) ? documentUri : resolvedUrl
}

export function isAllowedPreviewRequest (url: string, method: string, documentUri: string): boolean {
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
  const isPreviewDocument = resolvedUrl.href === expectedUrl.href
  const isApprovedProfileResource = resolvedUrl.pathname === '/profile/card'
  return (
    PREVIEW_READ_METHODS.has(normalizedMethod) &&
    (isPreviewDocument || isApprovedProfileResource)
  ) || (isPreviewDocument && PREVIEW_WRITE_METHODS.has(normalizedMethod))
}

function createPreviewBridge (html: string, uri: string, nonce: string, webId: string | null = null): string {
  const bridge = `<script>
(() => {
  const documentUri = ${JSON.stringify(uri)}
  const documentOrigin = new URL(documentUri).origin
  const nonce = ${JSON.stringify(nonce)}
  const viewerWebId = ${JSON.stringify(webId)}
  const pending = new Map()
  let requestId = 0
  try {
    history.replaceState(null, '', documentUri)
  } catch {
    // Sandboxed documents may reject cross-origin history URLs.
  }
  // Opaque sandbox origins cannot use IndexedDB. Dokieli uses it for local
  // preferences and history, so provide an in-memory implementation without
  // granting the preview a persistent storage capability.
  try {
    window.indexedDB.open('__solidos_probe__')
  } catch {
    const databases = new Map()
    const request = (result) => ({ result, error: null, onsuccess: null, onerror: null, onupgradeneeded: null })
    const isolatedIndexedDB = {
      open (name) {
        const stores = databases.get(name) || new Map()
        databases.set(name, stores)
        const database = {
          objectStoreNames: { contains: storeName => stores.has(storeName) },
          createObjectStore (storeName) {
            if (!stores.has(storeName)) stores.set(storeName, new Map())
            return database.transaction(storeName, 'readwrite').objectStore(storeName)
          },
          transaction (storeName, mode = 'readonly') {
            const store = stores.get(storeName) || new Map()
            stores.set(storeName, store)
            let pending = 0
            let completed = false
            const transaction = {
              oncomplete: null,
              onerror: null,
              onabort: null,
              objectStore: () => {
                const run = (result, change) => {
                  const operation = request(result)
                  pending++
                  queueMicrotask(() => {
                    try {
                      change?.()
                      operation.onsuccess?.({ target: operation })
                    } catch (error) {
                      operation.error = error
                      operation.onerror?.({ target: operation })
                    } finally {
                      pending--
                      if (!pending && !completed) {
                        completed = true
                        transaction.oncomplete?.({ target: transaction })
                      }
                    }
                  })
                  return operation
                }
                const openCursor = (withValue) => {
                  const keys = Array.from(store.keys())
                  const operation = request(null)
                  pending++
                  let index = 0
                  const emit = () => {
                    operation.result = index < keys.length
                      ? {
                          key: keys[index],
                          primaryKey: keys[index],
                          value: withValue ? store.get(keys[index]) : undefined,
                          continue: () => { index++; queueMicrotask(emit) }
                        }
                      : null
                    operation.onsuccess?.({ target: operation })
                    if (!operation.result) {
                      pending--
                      if (!pending && !completed) {
                        completed = true
                        transaction.oncomplete?.({ target: transaction })
                      }
                    }
                  }
                  queueMicrotask(emit)
                  return operation
                }
                return {
                transaction,
                get: key => run(store.get(key)),
                getAll: () => run(Array.from(store.values())),
                getAllKeys: () => run(Array.from(store.keys())),
                count: () => run(store.size),
                openCursor: () => openCursor(true),
                openKeyCursor: () => openCursor(false),
                put: (value, key) => run(undefined, () => store.set(key, value)),
                add: (value, key) => run(undefined, () => store.set(key, value)),
                delete: key => run(undefined, () => store.delete(key)),
                clear: () => run(undefined, () => store.clear())
                }
              }
            }
            return transaction
          },
          close () {}
        }
        const operation = request(database)
        queueMicrotask(() => {
          operation.onupgradeneeded?.({ target: operation })
          operation.onsuccess?.({ target: operation })
        })
        return operation
      },
      deleteDatabase (name) {
        databases.delete(name)
        const operation = request(undefined)
        queueMicrotask(() => operation.onsuccess?.({ target: operation }))
        return operation
      }
    }
    Object.defineProperty(window, 'indexedDB', { configurable: true, value: isolatedIndexedDB })
  }
  const nativeFetch = window.fetch.bind(window)

  function isSrcdocUrl (url) {
    return url === 'about:srcdoc' || /^file:\\/\\/srcdoc\\/?(?:[?#].*)?$/i.test(url)
  }

  function documentRequestUrl (url) {
    const resolvedUrl = new URL(url, documentUri).href
    // srcdoc keeps this URL even when history.replaceState is unavailable in
    // an opaque sandbox. Dokieli saves via document.location.href.
    return isSrcdocUrl(resolvedUrl) ? documentUri : resolvedUrl
  }

  function requestParent (url, init) {
    const id = String(++requestId)
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
      window.parent.postMessage({
        type: ${JSON.stringify(PREVIEW_REQUEST_TYPE)},
        nonce,
        id,
        url,
        method: init.method,
        headers: init.headers,
        body: init.body
      }, '*')
    })
  }

  window.addEventListener('message', event => {
    const message = event.data
    if (!message || message.type !== ${JSON.stringify(PREVIEW_RESPONSE_TYPE)} || message.nonce !== nonce) return
    const entry = pending.get(message.id)
    if (!entry) return
    pending.delete(message.id)
    if (!message.ok) {
      entry.reject(new Error(message.error || 'Preview request failed'))
      return
    }
    const responseBody = [204, 205, 304].includes(message.status) ? null : message.body
    entry.resolve(new Response(responseBody, {
      status: message.status,
      headers: message.headers
    }))
  })

  const reportHeight = () => {
    const elements = Array.from(document.querySelectorAll('*'))
    const height = Math.max(
      document.documentElement.scrollHeight,
      document.body ? document.body.scrollHeight : 0,
      ...elements.map(element => Math.max(
        element.scrollHeight,
        Math.ceil(element.getBoundingClientRect().bottom + window.scrollY)
      ))
    )
    window.parent.postMessage({ type: 'solidos-preview-size', height }, '*')
  }
  window.addEventListener('load', reportHeight)
  new ResizeObserver(reportHeight).observe(document.documentElement)
  if (document.body) new ResizeObserver(reportHeight).observe(document.body)
  new MutationObserver(reportHeight).observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true
  })
  window.setInterval(reportHeight, 500)
  reportHeight()

  window.fetch = async (input, init = {}) => {
    const request = input instanceof Request ? input : null
    const url = documentRequestUrl(request ? request.url : input)
    const method = (init.method || (request && request.method) || 'GET').toUpperCase()
    const sameOrigin = new URL(url).origin === documentOrigin
    const allowed = sameOrigin &&
      (${JSON.stringify(Array.from(PREVIEW_READ_METHODS))}.includes(method) ||
        (url === documentUri && ${JSON.stringify(Array.from(PREVIEW_WRITE_METHODS))}.includes(method)))
    if (!allowed) {
      return nativeFetch(input, init)
    }
    const headers = new Headers(request ? request.headers : undefined)
    for (const [key, value] of new Headers(init.headers || {}).entries()) headers.set(key, value)
    const body = method === 'GET' || method === 'HEAD'
      ? undefined
      : (init.body || (request ? await request.clone().text() : undefined))
    return requestParent(url, {
      method,
      headers: Object.fromEntries(headers.entries()),
      body
    })
  }

  const NativeXMLHttpRequest = window.XMLHttpRequest
  window.XMLHttpRequest = class PreviewXMLHttpRequest {
    constructor () {
      this._native = new NativeXMLHttpRequest()
      this._headers = {}
      this._listeners = {}
      this._intercepted = false
      this.readyState = 0
      this.status = 0
      this.statusText = ''
      this.response = null
      this.responseText = ''
    }

    addEventListener (type, listener) {
      this._listeners[type] = this._listeners[type] || []
      this._listeners[type].push(listener)
    }

    _emit (type) {
      const event = { target: this, currentTarget: this, type }
      if (typeof this['on' + type] === 'function') this['on' + type](event)
      for (const listener of this._listeners[type] || []) listener.call(this, event)
    }

    open (method, url, async = true, user, password) {
      const resolvedUrl = documentRequestUrl(url)
      this._method = String(method || 'GET').toUpperCase()
      this._url = resolvedUrl
      const sameOrigin = new URL(resolvedUrl).origin === documentOrigin
      this._intercepted = sameOrigin &&
        (${JSON.stringify(Array.from(PREVIEW_READ_METHODS))}.includes(this._method) ||
          (resolvedUrl === documentUri && ${JSON.stringify(Array.from(PREVIEW_WRITE_METHODS))}.includes(this._method)))
      if (!this._intercepted) {
        this._native.open(method, url, async, user, password)
        for (const type of ['abort', 'error', 'load', 'loadend', 'progress', 'readystatechange', 'timeout']) {
          this._native.addEventListener(type, event => this._emitNative(type, event))
        }
      }
      this.readyState = 1
      this._emit('readystatechange')
    }

    _emitNative (type, event) {
      this.readyState = this._native.readyState
      this.status = this._native.status
      this.statusText = this._native.statusText
      this.response = this._native.response
      this.responseText = this._native.responseText
      this._emit(type)
    }

    setRequestHeader (name, value) {
      if (this._intercepted) this._headers[name] = value
      else this._native.setRequestHeader(name, value)
    }

    send (body) {
      if (!this._intercepted) {
        this._native.send(body)
        return
      }
      requestParent(this._url, {
        method: this._method,
        headers: this._headers,
        body: this._method === 'GET' || this._method === 'HEAD' ? undefined : body
      }).then(async response => {
        this.status = response.status
        this.statusText = response.statusText
        this._responseHeaders = response.headers
        this.responseText = await response.text()
        this.response = this.responseText
        this.readyState = 4
        this._emit('readystatechange')
        this._emit(response.ok ? 'load' : 'error')
        this._emit('loadend')
      }).catch(() => {
        this.readyState = 4
        this._emit('readystatechange')
        this._emit('error')
        this._emit('loadend')
      })
    }

    abort () {
      if (!this._intercepted) this._native.abort()
      this._emit('abort')
    }

    getResponseHeader (name) {
      return this._responseHeaders?.get(name) || null
    }

    getAllResponseHeaders () {
      return this._responseHeaders
        ? Array.from(this._responseHeaders.entries()).map(([key, value]) => key + ': ' + value).join('\\r\\n')
        : ''
    }
  }

  // Dokieli's own OIDC session cannot be restored in an opaque-origin
  // sandbox, so it would always show "Sign in". Give it the SolidOS viewer
  // through the same session shape Dokieli uses for its WebExtension mode;
  // requests still go through the restricted bridge above.
  const bridgedSession = viewerWebId
    ? {
        isActive: true,
        webId: viewerWebId,
        authFetch: (input, init) => window.fetch(input, init),
        handleRedirectFromLogin: async () => {},
        restore: async () => {},
        login: async () => {},
        logout: async () => {
          bridgedSession.isActive = false
          bridgedSession.webId = undefined
        }
      }
    : null
  let dokieliHooksInstalled = false
  const installDokieliHooks = () => {
    const config = window.DO && window.DO.C
    if (!config || dokieliHooksInstalled) return
    dokieliHooksInstalled = true
    if (bridgedSession) config.Session = bridgedSession
    // Dokieli skips requests for file: URLs, which is how srcdoc reports
    // its location, so keep its document URL pointing at the resource.
    let documentUrl = config.DocumentURL
    Object.defineProperty(config, 'DocumentURL', {
      configurable: true,
      enumerable: true,
      get: () => documentUrl,
      set: value => {
        documentUrl = typeof value === 'string' && isSrcdocUrl(value) ? documentUri : value
      }
    })
    config.DocumentURL = documentUrl
  }
  // Registered before dokieli.js runs, so this precedes Dokieli's init.
  document.addEventListener('DOMContentLoaded', installDokieliHooks)
  window.addEventListener('load', installDokieliHooks)
})()
</script>`
  return withBaseHref(html, uri).replace(/<head(\s[^>]*)?>/i, match => `${match}${bridge}`)
}

function mountDokieliBridge (
  frame: HTMLIFrameElement,
  uri: string,
  html: string,
  authenticatedFetch: (url: string, init?: RequestInit) => Promise<Response>,
  webId: string | null = null
): void {
  const ownerWindow = frame.ownerDocument.defaultView
  if (!ownerWindow) return

  const randomValues = new Uint32Array(4)
  ownerWindow.crypto.getRandomValues(randomValues)
  const nonce = Array.from(randomValues, value => value.toString(16)).join('-')
  const expectedUri = new URL(uri).href
  const listener = (event: MessageEvent<PreviewRequest>) => {
    const request = event.data
    if (
      event.source !== frame.contentWindow ||
      !request ||
      request.type !== PREVIEW_REQUEST_TYPE ||
      request.nonce !== nonce ||
      !isAllowedPreviewRequest(request.url, request.method, expectedUri)
    ) return
    const requestUrl = previewRequestUrl(request.url, expectedUri)

    const respond = (response: PreviewResponse) => {
      frame.contentWindow?.postMessage(response, '*')
    }

    authenticatedFetch(requestUrl, {
      method: request.method,
      headers: request.headers,
      body: PREVIEW_READ_METHODS.has(request.method) ? undefined : request.body
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
  frame.srcdoc = createPreviewBridge(html, expectedUri, nonce, webId)
}

function installPreviewAutoSize (
  frame: HTMLIFrameElement,
  ownerWindow: Window
): () => void {
  const onMessage = (event: MessageEvent<{ type?: string, height?: number }>) => {
    const message = event.data
    if (
      event.source !== frame.contentWindow ||
      message?.type !== 'solidos-preview-size' ||
      typeof message.height !== 'number' ||
      !Number.isFinite(message.height)
    ) return
    frame.style.height = `${Math.max(1, Math.ceil(message.height))}px`
    frame.style.flexShrink = '0'
  }
  ownerWindow.addEventListener('message', onMessage)
  return () => ownerWindow.removeEventListener('message', onMessage)
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
    const isPlainText = ct === 'text/plain' || ct === 'application/json' || (!ct && isJsonFile(subject.uri))

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
      frame.title = resourceFilename(subject.uri)
      applyFrameClasses(frame, 'iframe')
      const ownerWindow = myDocument.defaultView
      const removePreviewAutoSize = ownerWindow
        ? installPreviewAutoSize(frame, ownerWindow)
        : () => {}
      const isHtml = ct === 'text/html' || ct === 'application/xhtml+xml'
      let previewUrl: string | null = null
      let disposed = false
      let wasConnected = false
      const mutationObserver = typeof MutationObserver === 'undefined'
        ? null
        : new MutationObserver(records => {
          const wasAdded = records.some(record =>
            Array.from(record.addedNodes).some(node =>
              node === div || (node.nodeType === Node.ELEMENT_NODE && (node as Element).contains(div))
            )
          )
          if (div.isConnected) {
            wasConnected = true
          } else if (wasConnected || wasAdded) {
            disposed = true
            if (previewUrl) {
              URL.revokeObjectURL(previewUrl)
              previewUrl = null
            }
            removePreviewAutoSize()
            mutationObserver?.disconnect()
          }
        })
      mutationObserver?.observe(myDocument, { childList: true, subtree: true })

      const showError = (message: string) => {
        frame.removeAttribute('src')
        frame.setAttribute('sandbox', '')
        frame.srcdoc = `<p style="font-family: sans-serif">${escapeAttribute(message)}</p>`
      }

      if (isHtml) {
        kb.fetcher.webOperation('GET', subject.uri).then(response => {
          const html = response.responseText ?? ''
          frame.title = documentTitle(html, subject.uri)
          const isDokieli = isDokieliHtml(html)
          dokieliCache.set(subject.uri, isDokieli ? 'dokieli' : 'html')
          if (isDokieli) {
            mountDokieliBridge(frame, subject.uri, html, (url, init) => kb.fetcher._fetch(url, init), viewerWebId())
          } else {
            frame.setAttribute('sandbox', HTML_PREVIEW_SANDBOX)
            frame.srcdoc = withPreviewResizeScript(withBaseHref(html, subject.uri))
          }
        }).catch(error => {
          console.error('Error fetching HTML content:', error)
          showError('Error loading content')
        })
      } else {
        kb.fetcher._fetch(subject.uri).then(async response => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`)
          const responseContentType = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase()
          if (responseContentType === 'text/html' || responseContentType === 'application/xhtml+xml') {
            const html = await response.text()
            frame.title = documentTitle(html, subject.uri)
            const isDokieli = isDokieliHtml(html)
            dokieliCache.set(subject.uri, isDokieli ? 'dokieli' : 'html')
            if (isDokieli) {
              mountDokieliBridge(frame, subject.uri, html, (url, init) => kb.fetcher._fetch(url, init), viewerWebId())
            } else {
              frame.setAttribute('sandbox', HTML_PREVIEW_SANDBOX)
              frame.srcdoc = withPreviewResizeScript(withBaseHref(html, subject.uri))
            }
            return
          }
          if (responseContentType !== 'application/pdf') {
            frame.setAttribute('sandbox', HTML_PREVIEW_SANDBOX)
          }
          const objectUrl = URL.createObjectURL(await response.blob())
          if (disposed) {
            URL.revokeObjectURL(objectUrl)
            return
          }
          previewUrl = objectUrl
          frame.src = objectUrl
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
