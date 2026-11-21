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
    const store = {
      fetcher: {
        webOperation: vi.fn().mockResolvedValue({
          responseText: '# Heading\n\n<script>alert("unsafe")</script>\n\n**bold**'
        })
      }
    }

    renderMarkdownContent(store as any, subject, frame)

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
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const store = {
      fetcher: {
        webOperation: vi.fn().mockRejectedValue(new Error('network failure'))
      }
    }

    renderMarkdownContent(store as any, subject, frame)

    await vi.waitFor(() => {
      expect(frame.textContent).toBe('Error loading content')
    })
    expect(console.error).toHaveBeenCalledWith(
      'Error fetching markdown content:',
      expect.any(Error)
    )
  })
})
