import { afterEach, describe, expect, it, vi } from 'vitest'
import { sym } from 'rdflib'
import { isDocxContentType, isDocxFile, renderDocxContent } from '../../src/humanReadable/docxPreview'
import humanReadablePane from '../../src/humanReadable'

const renderAsync = vi.hoisted(() => vi.fn())

vi.mock('docx-preview', () => ({ renderAsync }))

function createStore (fetcher: Record<string, unknown>) {
  return { fetcher } as any
}

afterEach(() => {
  renderAsync.mockReset()
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

describe('DOCX detection', () => {
  it('recognizes the DOCX content type and extension', () => {
    expect(isDocxContentType('application/vnd.openxmlformats-officedocument.wordprocessingml.document; charset=binary'))
      .toBe(true)
    expect(isDocxFile('https://pod.example/docs/report.docx?download=1')).toBe(true)
    expect(isDocxFile('https://pod.example/docs/report.doc')).toBe(false)
  })

  it('routes DOCX resources to Human Readable', () => {
    const store = {
      fetcher: { getHeader: vi.fn().mockReturnValue(['application/vnd.openxmlformats-officedocument.wordprocessingml.document']) },
      findTypeURIs: vi.fn().mockReturnValue({})
    }

    expect(humanReadablePane.label(sym('https://pod.example/docs/report.docx'), { session: { store } } as any))
      .toBe('View')
  })
})

describe('renderDocxContent', () => {
  it('fetches and renders DOCX content through the lazy renderer', async () => {
    renderAsync.mockResolvedValue(undefined)
    const response = new Response(new Uint8Array([1, 2, 3]), { status: 200 })
    const fetcher = { _fetch: vi.fn().mockResolvedValue(response) }
    const frame = document.createElement('div')
    const status = document.createElement('div')

    await renderDocxContent(createStore(fetcher), { uri: 'https://pod.example/report.docx' } as any, frame, status)

    expect(fetcher._fetch).toHaveBeenCalledWith('https://pod.example/report.docx')
    expect(renderAsync).toHaveBeenCalledWith(
      expect.any(ArrayBuffer),
      frame,
      undefined,
      expect.objectContaining({ className: 'human-readable-docx' })
    )
    expect(frame.className).toContain('human-readable-docx-preview')
  })

  it('renders the shared error state when DOCX loading fails', async () => {
    const fetcher = { _fetch: vi.fn().mockRejectedValue(new Error('network failure')) }
    const frame = document.createElement('div')
    const status = document.createElement('div')

    await renderDocxContent(createStore(fetcher), { uri: 'https://pod.example/report.docx' } as any, frame, status)

    expect(status.dataset.visible).toBe('true')
    expect(status.querySelector('solid-ui-error-state')).not.toBeNull()
  })
})
