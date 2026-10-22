import { describe, expect, it, vi } from 'vitest'
import humanReadablePane, { HUMAN_READABLE_PREVIEW_FRAME_NAME, withBaseHref } from '../../src/humanReadablePane'

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

  it('runs Dokieli documents in a same-origin frame at the document URL with the authenticated fetch', async () => {
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
    // jsdom does not move a document.open()ed frame to the opener's URL as browsers do.
    const replaceState = vi.spyOn(frame.contentWindow!.history, 'replaceState').mockImplementation(() => {})
    try {
      await flush()
      expect(frame.hasAttribute('sandbox')).toBe(false)
      expect(frame.hasAttribute('srcdoc')).toBe(false)
      expect(replaceState).toHaveBeenCalledWith(null, '', dokieliUri)
      expect(frame.contentDocument!.querySelector('h1')!.textContent).toBe('Dok')

      await frame.contentWindow!.fetch(dokieliUri, { method: 'PUT', body: 'x' })
      expect(authenticatedFetch).toHaveBeenCalledWith(dokieliUri, { method: 'PUT', body: 'x' })
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

  it('shows an error instead of the resource URL when the fetch fails', async () => {
    const webOperation = vi.fn().mockRejectedValue(new Error('401'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const pane = renderWith('text/html', { webOperation })
    await flush()

    const frame = pane.querySelector('iframe')!
    expect(frame.getAttribute('src')).toBeNull()
    expect(frame.srcdoc).toContain('Error loading content')
  })
})
