import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderMarkdownContent } from '../../src/humanReadable/markdownPreview'

const subject = { uri: 'https://pod.example/docs/readme.md' } as any

function createFrame () {
  const frame = document.createElement('div')
  document.body.appendChild(frame)
  return frame
}

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

describe('renderMarkdownContent', () => {
  it('renders Markdown and removes raw HTML', async () => {
    const frame = createFrame()
    const status = document.createElement('div')
    document.body.appendChild(status)
    const store = {
      fetcher: {
        webOperation: vi.fn().mockResolvedValue({
          responseText: '# Heading\n\n<script>alert("unsafe")</script>\n\n**bold**'
        })
      }
    }

    renderMarkdownContent(store as any, subject, frame, status)

    await vi.waitFor(() => {
      expect(frame.querySelector('h1')?.textContent).toBe('Heading')
    })
    expect(frame.querySelector('strong')?.textContent).toBe('bold')
    expect(frame.querySelector('script')).toBeNull()
    expect(frame).toHaveClass('human-readable-document-frame', 'human-readable-markdown-preview')
    expect(store.fetcher.webOperation).toHaveBeenCalledWith('GET', subject.uri)
  })

  it('shows an error when Markdown cannot be fetched', async () => {
    const frame = createFrame()
    const status = document.createElement('div')
    document.body.appendChild(status)
    const store = {
      fetcher: {
        webOperation: vi.fn().mockRejectedValue(new Error('network failure'))
      }
    }

    renderMarkdownContent(store as any, subject, frame, status)

    await vi.waitFor(() => {
      expect(status.querySelector('solid-ui-error-state')).not.toBeNull()
    })
    await vi.waitFor(() => {
      expect(status.querySelector('solid-ui-error-state')?.shadowRoot?.textContent)
        .toContain('The document could not be loaded.')
    })
  })
})
