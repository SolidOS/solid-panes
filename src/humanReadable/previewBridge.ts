/**
 * Generates the script installed in a sandboxed Dokieli preview.
 *
 * The preview remains untrusted: the parent window validates every request
 * before delegating it to the authenticated Solid fetcher.
 */
export type PreviewBridgeOptions = {
  bridgeAttribute: string
  requestType: string
  responseType: string
  readMethods: string[]
  writeMethods: string[]
  withBaseHref: (html: string, baseUri: string) => string
  stripPreviewBridgeScripts: (html: string | undefined) => string | undefined
}

export function createPreviewBridge (
  html: string,
  uri: string,
  nonce: string,
  options: PreviewBridgeOptions,
  webId: string | null = null
): string {
  const bridge = `<script ${options.bridgeAttribute}="true">
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
  const createMemoryStorage = () => {
    const values = new Map()
    return {
      get length () { return values.size },
      key: index => Array.from(values.keys())[index] ?? null,
      getItem: key => values.get(String(key)) ?? null,
      setItem: (key, value) => values.set(String(key), String(value)),
      removeItem: key => values.delete(String(key)),
      clear: () => values.clear()
    }
  }
  for (const storageName of ['localStorage', 'sessionStorage']) {
    try {
      window[storageName].getItem('__solidos_probe__')
    } catch {
      Object.defineProperty(window, storageName, {
        configurable: true,
        value: createMemoryStorage()
      })
    }
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
        type: ${JSON.stringify(options.requestType)},
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
    if (!message || message.type !== ${JSON.stringify(options.responseType)} || message.nonce !== nonce) return
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
      (${JSON.stringify(options.readMethods)}.includes(method) ||
        (url === documentUri && ${JSON.stringify(options.writeMethods)}.includes(method)))
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
        (${JSON.stringify(options.readMethods)}.includes(this._method) ||
          (resolvedUrl === documentUri && ${JSON.stringify(options.writeMethods)}.includes(this._method)))
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
  const cleanHtml = options.stripPreviewBridgeScripts(html) ?? html
  return options.withBaseHref(cleanHtml, uri).replace(/<head(\s[^>]*)?>/i, match => `${match}${bridge}`)
}
