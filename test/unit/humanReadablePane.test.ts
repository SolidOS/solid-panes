import { afterEach, describe, expect, it, vi } from 'vitest'
import { sym } from 'rdflib'
import { authn } from 'solid-logic'
import type IframePreview from '../../src/components/iframe-preview/IframePreview'
import humanReadablePane, {
  IFRAME_PREVIEW_FRAME_NAME,
  isAllowedPreviewRequest,
  previewRequestUrl,
  withBaseHref
} from '../../src/humanReadable'

const uri = 'https://pod.example/docs/page.html'

function renderWith (contentType: string, fetcher: Record<string, any>) {
  const subject = { uri, doc: () => subject }
  const store = {
    fetcher: { getHeader: vi.fn().mockReturnValue([contentType]), ...fetcher }
  }
  const context = { dom: document, session: { store } } as any
  const pane = humanReadablePane.render(subject as any, context)
  document.body.appendChild(pane)
  return pane
}

function getFrame (pane: Element): HTMLIFrameElement | null {
  const preview = pane.querySelector('solid-panes-iframe-preview')
  return preview?.shadowRoot?.querySelector('iframe') ?? null
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0))
const htmlResponse = (content: string) => new Response(content, {
  headers: { 'content-type': 'text/html' }
})

afterEach(() => {
  document.querySelectorAll('.human-readable-pane').forEach(pane => pane.remove())
  vi.restoreAllMocks()
})

async function waitForSrcdoc (pane: Element, text: string) {
  await vi.waitFor(() => {
    expect(getFrame(pane)?.srcdoc).toContain(text)
  })
}

describe('withBaseHref', () => {
  it('inserts a base element at the start of head', () => {
    expect(withBaseHref('<html><head lang="en"><title>x</title></head></html>', uri))
      .toBe(`<html><head lang="en"><base href="${uri}"><title>x</title></head></html>`)
  })

  it('prepends a base element when there is no head', () => {
    expect(withBaseHref('<p>hi</p>', uri)).toBe(`<base href="${uri}"><p>hi</p>`)
  })

  it('keeps an existing base element', () => {
    const html = '<head><base href="https://other.example/"></head>'
    expect(withBaseHref(html, uri)).toBe(html)
  })

  it('resolves a relative existing base element against the resource URI', () => {
    const html = '<head><base href="../assets/"></head>'
    expect(withBaseHref(html, uri))
      .toBe('<head><base href="https://pod.example/assets/"></head>')
  })
})

describe('previewRequestUrl', () => {
  it.each([
    'about:srcdoc',
    'file://srcdoc/',
    'file://srcdoc',
    'file://srcdoc/?preview=1',
    'file://srcdoc/#preview'
  ])('maps the srcdoc URL variant %s to the preview document', value => {
    expect(previewRequestUrl(value, uri)).toBe(uri)
  })

  it('does not rewrite legitimate file URLs', () => {
    expect(previewRequestUrl('file:///Users/example/document.html', uri))
      .toBe('file:///Users/example/document.html')
    expect(previewRequestUrl('file://srcdoc/other.html', uri))
      .toBe('file://srcdoc/other.html')
  })
})

describe('isAllowedPreviewRequest', () => {
  it('allows authenticated same-origin reads for related profile resources', () => {
    expect(isAllowedPreviewRequest('https://pod.example/profile/card', 'GET', uri)).toBe(true)
    expect(isAllowedPreviewRequest('https://pod.example/profile/card', 'HEAD', uri)).toBe(true)
  })

  it('allows the viewer profile document on path-based pods', () => {
    const pathPodDocument = 'http://localhost:3100/alice/notes/doc.html'
    const webId = 'http://localhost:3100/alice/profile/card#me'
    expect(isAllowedPreviewRequest('http://localhost:3100/alice/profile/card', 'GET', pathPodDocument, webId)).toBe(true)
    expect(isAllowedPreviewRequest('http://localhost:3100/alice/profile/card#me', 'GET', pathPodDocument, webId)).toBe(true)
    expect(isAllowedPreviewRequest('http://localhost:3100/alice/profile/card', 'GET', pathPodDocument)).toBe(false)
    expect(isAllowedPreviewRequest('http://localhost:3100/bob/profile/card', 'GET', pathPodDocument, webId)).toBe(false)
    expect(isAllowedPreviewRequest('http://localhost:3100/alice/settings/prefs.ttl', 'GET', pathPodDocument, webId)).toBe(false)
    expect(isAllowedPreviewRequest('http://localhost:3100/alice/profile/card', 'PUT', pathPodDocument, webId)).toBe(false)
  })

  it('allows writes only to the previewed document', () => {
    expect(isAllowedPreviewRequest(uri, 'PUT', uri)).toBe(true)
    expect(isAllowedPreviewRequest('https://pod.example/profile/card', 'PUT', uri)).toBe(false)
  })

  it('allows reads of the previewed document with a fragment', () => {
    expect(isAllowedPreviewRequest(`${uri}#saved`, 'GET', uri)).toBe(true)
    expect(isAllowedPreviewRequest(`${uri}#saved`, 'HEAD', uri)).toBe(true)
    expect(isAllowedPreviewRequest(`${uri}#saved`, 'PUT', uri)).toBe(false)
  })

  it('blocks cross-origin reads', () => {
    expect(isAllowedPreviewRequest('https://other.example/profile/card', 'GET', uri)).toBe(false)
    expect(isAllowedPreviewRequest('https://pod.example/private/data', 'GET', uri)).toBe(false)
    expect(isAllowedPreviewRequest('https://pod.example/profile/settings', 'GET', uri)).toBe(false)
  })
})

describe('human readable pane iframe rendering', () => {
  it.each(['text/markdown', 'text/markdown; charset=utf-8', 'text/markdown; charset=UTF-8; format=flowed'])(
    'renders Markdown from content type %s without a Markdown filename',
    async contentType => {
      const webOperation = vi.fn().mockResolvedValue({ responseText: '# Markdown heading' })
      const store = { fetcher: { getHeader: vi.fn().mockReturnValue([contentType]) }, findTypeURIs: vi.fn().mockReturnValue({}) }
      expect(humanReadablePane.label(sym(uri), { session: { store } } as any)).toBe('View')
      const pane = renderWith(contentType, { webOperation })

      await vi.waitFor(() => {
        expect(pane.querySelector('.human-readable-pane__frame--markdown h1')?.textContent)
          .toBe('Markdown heading')
      })
      expect(pane.querySelector('.human-readable-pane__frame--plain-text')).toBeNull()
      expect(getFrame(pane)).toBeNull()
    }
  )

  it('renders JSON as readable text', async () => {
    const webOperation = vi.fn().mockResolvedValue({ responseText: '{\n  "enabled": true\n}' })
    const pane = renderWith('application/json', { webOperation })
    await flush()

    expect(pane.querySelector('pre')?.textContent).toBe('{\n  "enabled": true\n}')
    expect(pane.querySelector('iframe')).toBeNull()
    expect(webOperation).toHaveBeenCalledWith('GET', uri)
  })

  it('renders HTML from the authenticated fetch instead of letting the iframe request it', async () => {
    const fetch = vi.fn().mockResolvedValue(htmlResponse('<html><head></head><body>Hello</body></html>'))
    const pane = renderWith('text/html', { _fetch: fetch })
    await waitForSrcdoc(pane, 'Hello')

    const frame = getFrame(pane)!
    expect(fetch).toHaveBeenCalledWith(uri)
    expect(frame.getAttribute('src')).toBeNull()
    expect(frame.srcdoc).toContain('Hello')
    expect(frame.srcdoc).toContain(`<base href="${uri}">`)
    expect(frame.name).toBe(IFRAME_PREVIEW_FRAME_NAME)
    expect(frame.getAttribute('sandbox')).not.toContain('allow-same-origin')
    expect(pane.classList.contains('human-readable-pane--iframe')).toBe(true)
    expect(pane.querySelector('a')).toBeNull()
  })

  it('renders HTML fragments without adding a resize script', async () => {
    const pane = renderWith('text/html', {
      _fetch: vi.fn().mockResolvedValue(htmlResponse('<main>Fragment</main>'))
    })
    await waitForSrcdoc(pane, 'Fragment')

    expect(getFrame(pane)?.srcdoc).not.toContain('solidos-preview-size')
  })

  it('labels an HTML iframe from its fetched title and falls back to its URI filename', async () => {
    const titled = renderWith('text/html', {
      _fetch: vi.fn().mockResolvedValue(htmlResponse('<html><head><title>  A useful title  </title></head></html>'))
    })
    await waitForSrcdoc(titled, 'A useful title')
    expect(getFrame(titled)?.title).toBe('A useful title')

    const untitled = renderWith('text/html', {
      _fetch: vi.fn().mockResolvedValue(htmlResponse('<html><body>No title</body></html>'))
    })
    await waitForSrcdoc(untitled, 'No title')
    expect(getFrame(untitled)?.title).toBe('page.html')
  })

  it('keeps Dokieli documents isolated and mediates same-origin reads plus exact-document writes', async () => {
    const dokieliUri = `${window.location.origin}/docs/dok.html`
    const html = '<html><head><script>(() =&gt; { const pending = new Map(); window.parent.postMessage({type: "solidos-preview-request"}); window.postMessage({type: "solidos-preview-response"}); window.__stalePreviewBridge = true; })()</script><script src="https://dokie.li/scripts/dokieli.js"></script></head><body><h1>Dok</h1></body></html>'
    const authenticatedFetch = vi.fn().mockImplementation((_url, init) =>
      Promise.resolve(init ? new Response('ok') : htmlResponse(html)))
    const subject = { uri: dokieliUri, doc: () => subject }
    const store = {
      fetcher: {
        getHeader: vi.fn().mockReturnValue(['text/html']),
        _fetch: authenticatedFetch
      }
    }
    const pane = humanReadablePane.render(subject as any, { dom: document, session: { store } } as any)
    document.body.appendChild(pane)
    try {
      await waitForSrcdoc(pane, 'solidos-preview-request')
      const frame = getFrame(pane)!
      // jsdom does not create browsing contexts for iframes in shadow roots.
      Object.defineProperty(frame, 'contentWindow', { configurable: true, value: window })
      authenticatedFetch.mockClear()
      expect(frame.getAttribute('sandbox')).toBe('allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals')
      expect(frame.srcdoc).toContain('solidos-preview-request')
      expect(frame.srcdoc).toContain('dokieli.js')
      expect(frame.srcdoc.match(/<script data-solidos-preview-bridge="true">/g)).toHaveLength(1)
      expect(frame.srcdoc).not.toContain('__stalePreviewBridge')
      expect(frame.srcdoc).toContain('file:\\/\\/srcdoc')
      expect(frame.srcdoc).toContain('const url = documentRequestUrl(request ? request.url : input)')
      expect(frame.srcdoc).toContain('const resolvedUrl = documentRequestUrl(url)')
      expect(frame.srcdoc).toContain('const responseBody = [204, 205, 304].includes(message.status) ? null : message.body')
      expect(frame.srcdoc).toContain('getAllKeys')
      expect(frame.srcdoc).toContain('transaction.oncomplete')
      expect(frame.srcdoc).toContain('openCursor: () => openCursor(true)')
      expect(frame.srcdoc).toContain('createMemoryStorage')
      expect(frame.srcdoc).toMatch(/storageName of \['localStorage', 'sessionStorage'\]/)

      window.dispatchEvent(new MessageEvent('message', {
        source: frame.contentWindow,
        data: {
          type: 'solidos-preview-request',
          nonce: frame.srcdoc.match(/const nonce = "([^"]+)"/)?.[1],
          id: 'save',
          url: dokieliUri,
          method: 'PUT',
          body: 'x'
        }
      }))
      await flush()
      expect(authenticatedFetch).toHaveBeenCalledWith(dokieliUri, {
        method: 'PUT',
        headers: undefined,
        body: 'x'
      })
      authenticatedFetch.mockClear()
      window.dispatchEvent(new MessageEvent('message', {
        source: frame.contentWindow,
        data: {
          type: 'solidos-preview-request',
          nonce: frame.srcdoc.match(/const nonce = "([^"]+)"/)?.[1],
          id: 'save-with-bridge',
          url: dokieliUri,
          method: 'PUT',
          body: '<!doctype html><html><head><script data-solidos-preview-bridge="true">window.__bridge = true</script><script>(() =&gt; { const pending = new Map(); window.parent.postMessage({type: "solidos-preview-request"}); window.postMessage({type: "solidos-preview-response"}); })()</script></head><body><h1>Saved</h1></body></html>'
        }
      }))
      await flush()
      const savedBody = authenticatedFetch.mock.calls[0][1]?.body as string
      expect(savedBody).toContain('<h1>Saved</h1>')
      expect(savedBody).not.toContain('solidos-preview-bridge')
      expect(savedBody).not.toContain('solidos-preview-request')
      authenticatedFetch.mockClear()
      window.dispatchEvent(new MessageEvent('message', {
        source: frame.contentWindow,
        data: {
          type: 'solidos-preview-request',
          nonce: frame.srcdoc.match(/const nonce = "([^"]+)"/)?.[1],
          id: 'profile-read',
          url: `${window.location.origin}/profile/card`,
          method: 'GET'
        }
      }))
      await flush()
      expect(authenticatedFetch).toHaveBeenCalledWith(`${window.location.origin}/profile/card`, {
        method: 'GET',
        headers: undefined,
        body: undefined
      })
      authenticatedFetch.mockClear()
      window.dispatchEvent(new MessageEvent('message', {
        source: frame.contentWindow,
        data: {
          type: 'solidos-preview-request',
          nonce: frame.srcdoc.match(/const nonce = "([^"]+)"/)?.[1],
          id: 'save-from-srcdoc',
          // When history.replaceState is unavailable in the opaque sandbox,
          // Dokieli saves to document.location.href, which is about:srcdoc.
          url: 'about:srcdoc',
          method: 'PUT',
          body: 'saved from srcdoc'
        }
      }))
      await flush()
      expect(authenticatedFetch).toHaveBeenCalledWith(dokieliUri, {
        method: 'PUT',
        headers: undefined,
        body: 'saved from srcdoc'
      })
      authenticatedFetch.mockClear()
      window.dispatchEvent(new MessageEvent('message', {
        source: frame.contentWindow,
        data: {
          type: 'solidos-preview-request',
          nonce: frame.srcdoc.match(/const nonce = "([^"]+)"/)?.[1],
          id: 'save-from-file-srcdoc',
          url: 'file://srcdoc/',
          method: 'PUT',
          body: 'saved from file srcdoc'
        }
      }))
      await flush()
      expect(authenticatedFetch).toHaveBeenCalledWith(dokieliUri, {
        method: 'PUT',
        headers: undefined,
        body: 'saved from file srcdoc'
      })
      authenticatedFetch.mockClear()
      const postToPreview = vi.spyOn(window, 'postMessage')
      window.dispatchEvent(new MessageEvent('message', {
        source: frame.contentWindow,
        data: {
          type: 'solidos-preview-request',
          nonce: frame.srcdoc.match(/const nonce = "([^"]+)"/)?.[1],
          id: 'other',
          url: 'https://other.example/private/other-user.ttl',
          method: 'GET'
        }
      }))
      await flush()
      expect(authenticatedFetch).not.toHaveBeenCalled()
      // Denied requests are still answered so the preview never waits forever.
      expect(postToPreview).toHaveBeenCalledWith(expect.objectContaining({
        type: 'solidos-preview-response',
        id: 'other',
        ok: false,
        status: 403
      }), '*')
      pane.remove()
      window.dispatchEvent(new MessageEvent('message', {
        source: window,
        data: {
          type: 'solidos-preview-request',
          nonce: frame.srcdoc.match(/const nonce = "([^"]+)"/)?.[1],
          id: 'after-removal',
          url: dokieliUri,
          method: 'PUT',
          body: 'x'
        }
      }))
      await flush()
      expect(authenticatedFetch).not.toHaveBeenCalled()
    } finally {
      pane.remove()
    }
  })

  it('keeps cross-origin Dokieli documents in the isolated preview', async () => {
    const fetch = vi.fn().mockResolvedValue(htmlResponse('<html><head><script src="https://dokie.li/scripts/dokieli.js"></script></head></html>'))
    const pane = renderWith('text/html', { _fetch: fetch })
    await waitForSrcdoc(pane, 'dokieli.js')

    const frame = getFrame(pane)!
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals')
    expect(frame.srcdoc).toContain('dokieli.js')
  })

  it('uses the actual response MIME type to isolate HTML returned for a non-HTML resource', async () => {
    const response = new Response('<html><body><script>window.parent.compromised = true</script></body></html>', {
      headers: { 'content-type': 'text/html; charset=utf-8' }
    })
    const pane = renderWith('image/png', { _fetch: vi.fn().mockResolvedValue(response) })
    await waitForSrcdoc(pane, 'compromised')

    const frame = getFrame(pane)!
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals')
    expect(frame.src).toBe('')
    expect(frame.srcdoc).toContain('compromised')
  })

  it('does not sandbox PDF blob previews so the browser viewer can render them', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:https://pod.example/resource')
    const response = new Response('pdf data', {
      headers: { 'content-type': 'application/pdf' }
    })
    const pane = renderWith('application/octet-stream', { _fetch: vi.fn().mockResolvedValue(response) })
    await vi.waitFor(() => expect(getFrame(pane)?.src).toBe('blob:https://pod.example/resource'))

    const frame = getFrame(pane)!
    expect(frame.getAttribute('sandbox')).toBeNull()
    expect(frame.src).toBe('blob:https://pod.example/resource')
    expect(createObjectURL).toHaveBeenCalled()
    createObjectURL.mockRestore()
  })

  it('keeps non-PDF blob previews sandboxed', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:https://pod.example/resource')
    const response = new Response('<svg xmlns="http://www.w3.org/2000/svg"><script>window.compromised = true</script></svg>', {
      headers: { 'content-type': 'image/svg+xml' }
    })
    const pane = renderWith('image/svg+xml', { _fetch: vi.fn().mockResolvedValue(response) })
    await vi.waitFor(() => expect(createObjectURL).toHaveBeenCalled())

    expect(getFrame(pane)?.getAttribute('sandbox'))
      .toBe('allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals')
    createObjectURL.mockRestore()
  })

  it('does not create a blob URL when the preview is removed before fetching completes', async () => {
    let resolveResponse!: (response: Response) => void
    const responsePromise = new Promise<Response>(resolve => { resolveResponse = resolve })
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:https://pod.example/resource')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const fetch = vi.fn().mockReturnValue(responsePromise)
    const pane = renderWith('application/pdf', { _fetch: fetch })
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
    pane.remove()
    resolveResponse(new Response('pdf', {
      headers: { 'content-type': 'application/pdf' }
    }))
    await flush()
    await flush()

    expect(createObjectURL).not.toHaveBeenCalled()
    expect(revokeObjectURL).not.toHaveBeenCalled()
    createObjectURL.mockRestore()
    revokeObjectURL.mockRestore()
  })

  it('revokes an active blob URL when the preview is removed', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:https://pod.example/resource')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const pane = renderWith('application/pdf', {
      _fetch: vi.fn().mockResolvedValue(new Response('pdf', { headers: { 'content-type': 'application/pdf' } }))
    })
    await vi.waitFor(() => expect(getFrame(pane)?.src).toBe('blob:https://pod.example/resource'))
    pane.remove()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:https://pod.example/resource')
    createObjectURL.mockRestore()
    revokeObjectURL.mockRestore()
  })

  it('loads a changed subject and ignores the earlier response', async () => {
    let resolveFirst!: (response: Response) => void
    const firstResponse = new Promise<Response>(resolve => { resolveFirst = resolve })
    const fetch = vi.fn()
      .mockReturnValueOnce(firstResponse)
      .mockResolvedValueOnce(htmlResponse('<p>New document</p>'))
    const pane = renderWith('text/html', { _fetch: fetch })
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledWith(uri))

    const preview = pane.querySelector('solid-panes-iframe-preview') as IframePreview
    const nextUri = 'https://pod.example/docs/next.html'
    preview.subject = sym(nextUri)
    await waitForSrcdoc(pane, 'New document')
    expect(fetch).toHaveBeenCalledWith(nextUri)

    resolveFirst(htmlResponse('<p>Stale document</p>'))
    await flush()
    expect(getFrame(pane)?.srcdoc).toContain('New document')
    expect(getFrame(pane)?.srcdoc).not.toContain('Stale document')
  })

  it.each(['text/html', 'application/octet-stream'])('does not attach a late Dokieli bridge after a %s preview is removed', async contentType => {
    let resolveResponse!: (response: Response) => void
    const responsePromise = new Promise<Response>(resolve => { resolveResponse = resolve })
    const fetch = vi.fn().mockReturnValue(responsePromise)
    const pane = renderWith(contentType, {
      _fetch: fetch
    })
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled())
    const frame = getFrame(pane)!
    pane.remove()
    const addListener = vi.spyOn(window, 'addEventListener')
    const html = '<script src="https://dokie.li/scripts/dokieli.js"></script>'
    resolveResponse(htmlResponse(html))
    await flush()
    expect(frame.srcdoc).toBe('')
    expect(addListener).not.toHaveBeenCalledWith('message', expect.any(Function))
    addListener.mockRestore()
  })

  it('shows an error instead of the resource URL when the fetch fails', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('401'))
    const pane = renderWith('text/html', { _fetch: fetch })
    const preview = pane.querySelector('solid-panes-iframe-preview')!
    await vi.waitFor(() => expect(preview.shadowRoot?.querySelector('solid-ui-error-state')).not.toBeNull())

    const frame = getFrame(pane)!
    expect(frame.getAttribute('src')).toBeNull()
    expect(preview.shadowRoot?.querySelector('solid-ui-error-state')).toHaveProperty('message', '401')

    preview.shadowRoot?.querySelector('solid-ui-error-state')?.dispatchEvent(new CustomEvent('close', {
      bubbles: true,
      composed: true
    }))
    await flush()
    expect(preview.shadowRoot?.querySelector('solid-ui-error-state')).toBeNull()
  })

  it('falls back to the encoded filename when it is not valid UTF-8', async () => {
    const invalidUri = 'https://pod.example/docs/file%FF.pdf'
    const subject = { uri: invalidUri, doc: () => subject }
    const store = {
      fetcher: {
        getHeader: vi.fn().mockReturnValue(['application/pdf']),
        _fetch: vi.fn().mockResolvedValue(new Response('pdf', {
          headers: { 'content-type': 'application/pdf' }
        }))
      }
    }
    const pane = humanReadablePane.render(subject as any, { dom: document, session: { store } } as any)
    document.body.appendChild(pane)
    await vi.waitFor(() => expect(getFrame(pane)?.title).toBe('file%FF.pdf'))

    expect(getFrame(pane)?.title).toBe('file%FF.pdf')
  })

  it('gives Dokieli the signed-in viewer as a bridged session', async () => {
    const webId = 'https://pod.example/profile/card#me'
    const spy = vi.spyOn(authn, 'currentUser').mockReturnValue(sym(webId) as any)
    const dokieliUri = `${window.location.origin}/docs/dok-session.html`
    const html = '<html><head><script src="https://dokie.li/scripts/dokieli.js"></script></head><body></body></html>'
    const subject = { uri: dokieliUri, doc: () => subject }
    const store = {
      fetcher: {
        getHeader: vi.fn().mockReturnValue(['text/html']),
        _fetch: vi.fn().mockImplementation(() => Promise.resolve(htmlResponse(html)))
      }
    }
    try {
      const pane = humanReadablePane.render(subject as any, { dom: document, session: { store } } as any)
      document.body.appendChild(pane)
      await waitForSrcdoc(pane, 'const viewerWebId')
      const srcdoc = getFrame(pane)!.srcdoc
      expect(srcdoc).toContain(`const viewerWebId = ${JSON.stringify(webId)}`)
      expect(srcdoc).toContain('if (bridgedSession) config.Session = bridgedSession')
      expect(srcdoc).toContain('Object.defineProperty(config, \'DocumentURL\'')
      expect(srcdoc.indexOf('bridgedSession')).toBeLessThan(srcdoc.indexOf('dokieli.js'))

      spy.mockReturnValue(null)
      const loggedOut = humanReadablePane.render(subject as any, { dom: document, session: { store } } as any)
      document.body.appendChild(loggedOut)
      await waitForSrcdoc(loggedOut, 'const viewerWebId')
      expect(getFrame(loggedOut)!.srcdoc).toContain('const viewerWebId = null')
    } finally {
      spy.mockRestore()
    }
  })
})
