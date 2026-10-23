import { describe, expect, it, vi } from 'vitest'
import humanReadablePane, {
  HUMAN_READABLE_PREVIEW_FRAME_NAME,
  previewRequestUrl,
  withBaseHref
} from '../../src/humanReadablePane'

const uri = 'https://pod.example/docs/page.html'

function renderWith (contentType: string, fetcher: Record<string, any>) {
  const subject = { uri, doc: () => subject }
  const store = {
    fetcher: { getHeader: vi.fn().mockReturnValue([contentType]), ...fetcher }
  }
  const context = { dom: document, session: { store } } as any
  return humanReadablePane.render(subject as any, context)
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

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

describe('human readable pane iframe rendering', () => {
  it('renders HTML from the authenticated fetch instead of letting the iframe request it', async () => {
    const webOperation = vi.fn().mockResolvedValue({ responseText: '<html><head></head><body>Hello</body></html>' })
    const pane = renderWith('text/html', { webOperation })
    await flush()

    const frame = pane.querySelector('iframe')!
    expect(webOperation).toHaveBeenCalledWith('GET', uri)
    expect(frame.getAttribute('src')).toBeNull()
    expect(frame.srcdoc).toContain('Hello')
    expect(frame.srcdoc).toContain(`<base href="${uri}">`)
    expect(frame.name).toBe(HUMAN_READABLE_PREVIEW_FRAME_NAME)
    expect(frame.getAttribute('sandbox')).not.toContain('allow-same-origin')
    expect(pane.classList.contains('human-readable-pane--iframe')).toBe(true)
    expect(pane.querySelector('a')).toBeNull()
  })

  it('labels an HTML iframe from its fetched title and falls back to its URI filename', async () => {
    const titled = renderWith('text/html', {
      webOperation: vi.fn().mockResolvedValue({ responseText: '<html><head><title>  A useful title  </title></head></html>' })
    })
    await flush()
    expect(titled.querySelector('iframe')?.title).toBe('A useful title')

    const untitled = renderWith('text/html', {
      webOperation: vi.fn().mockResolvedValue({ responseText: '<html><body>No title</body></html>' })
    })
    await flush()
    expect(untitled.querySelector('iframe')?.title).toBe('page.html')
  })

  it('keeps Dokieli documents isolated and mediates exact-document requests', async () => {
    const dokieliUri = `${window.location.origin}/docs/dok.html`
    const html = '<html><head><script src="https://dokie.li/scripts/dokieli.js"></script></head><body><h1>Dok</h1></body></html>'
    const authenticatedFetch = vi.fn().mockResolvedValue(new Response('ok'))
    const subject = { uri: dokieliUri, doc: () => subject }
    const store = {
      fetcher: {
        getHeader: vi.fn().mockReturnValue(['text/html']),
        webOperation: vi.fn().mockResolvedValue({ responseText: html }),
        _fetch: authenticatedFetch
      }
    }
    const pane = humanReadablePane.render(subject as any, { dom: document, session: { store } } as any)
    document.body.appendChild(pane)
    const frame = pane.querySelector('iframe')!
    try {
      await flush()
      expect(frame.getAttribute('sandbox')).toBe('allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals')
      expect(frame.srcdoc).toContain('solidos-preview-request')
      expect(frame.srcdoc).toContain('dokieli.js')
      expect(frame.srcdoc).toContain('file:\\/\\/srcdoc')
      expect(frame.srcdoc).toContain('const url = documentRequestUrl(request ? request.url : input)')
      expect(frame.srcdoc).toContain('const resolvedUrl = documentRequestUrl(url)')
      expect(frame.srcdoc).toContain('const responseBody = [204, 205, 304].includes(message.status) ? null : message.body')
      expect(frame.srcdoc).toContain('getAllKeys')
      expect(frame.srcdoc).toContain('transaction.oncomplete')

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
      window.dispatchEvent(new MessageEvent('message', {
        source: frame.contentWindow,
        data: {
          type: 'solidos-preview-request',
          nonce: frame.srcdoc.match(/const nonce = "([^"]+)"/)?.[1],
          id: 'other',
          url: `${window.location.origin}/private/other-user.ttl`,
          method: 'GET'
        }
      }))
      await flush()
      expect(authenticatedFetch).not.toHaveBeenCalled()
    } finally {
      pane.remove()
    }
  })

  it('keeps cross-origin Dokieli documents in the isolated preview', async () => {
    const webOperation = vi.fn().mockResolvedValue({
      responseText: '<html><head><script src="https://dokie.li/scripts/dokieli.js"></script></head></html>'
    })
    const pane = renderWith('text/html', { webOperation })
    await flush()

    const frame = pane.querySelector('iframe')!
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals')
    expect(frame.srcdoc).toContain('dokieli.js')
  })

  it('uses the actual response MIME type to isolate HTML returned for a non-HTML resource', async () => {
    const response = new Response('<html><body><script>window.parent.compromised = true</script></body></html>', {
      headers: { 'content-type': 'text/html; charset=utf-8' }
    })
    const pane = renderWith('image/png', { _fetch: vi.fn().mockResolvedValue(response) })
    await flush()

    const frame = pane.querySelector('iframe')!
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals')
    expect(frame.src).toBe('')
    expect(frame.srcdoc).toContain('compromised')
  })

  it('sandboxes blob previews even when the actual response is non-HTML', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:https://pod.example/resource')
    const response = new Response('image data', {
      headers: { 'content-type': 'image/png' }
    })
    const pane = renderWith('application/octet-stream', { _fetch: vi.fn().mockResolvedValue(response) })
    await flush()

    const frame = pane.querySelector('iframe')!
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals')
    expect(frame.src).toBe('blob:https://pod.example/resource')
    expect(createObjectURL).toHaveBeenCalled()
    createObjectURL.mockRestore()
  })

  it('revokes a blob URL when the preview is removed before fetching completes', async () => {
    let resolveResponse!: (response: Response) => void
    const responsePromise = new Promise<Response>(resolve => { resolveResponse = resolve })
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:https://pod.example/resource')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const pane = renderWith('application/pdf', { _fetch: vi.fn().mockReturnValue(responsePromise) })
    document.body.appendChild(pane)
    pane.remove()
    resolveResponse(new Response('pdf', {
      headers: { 'content-type': 'application/pdf' }
    }))
    await flush()
    await flush()

    expect(createObjectURL).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:https://pod.example/resource')
    createObjectURL.mockRestore()
    revokeObjectURL.mockRestore()
  })

  it('shows an error instead of the resource URL when the fetch fails', async () => {
    const webOperation = vi.fn().mockRejectedValue(new Error('401'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const pane = renderWith('text/html', { webOperation })
    await flush()

    const frame = pane.querySelector('iframe')!
    expect(frame.getAttribute('src')).toBeNull()
    expect(frame.srcdoc).toContain('Error loading content')
  })

  it('falls back to the encoded filename when it is not valid UTF-8', () => {
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

    expect(pane.querySelector('iframe')?.title).toBe('file%FF.pdf')
  })
})
