import { afterEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { sym } from 'rdflib'
import humanReadablePane from '../../src/humanReadable'

const uri = 'https://pod.example/docs/resource'
const subject = sym(uri)

function renderPane (
  contentType: string,
  fetcher: Record<string, unknown> = {},
  environment: Record<string, string> = {}
): HTMLElement {
  const store = {
    fetcher: {
      getHeader: vi.fn().mockReturnValue([contentType]),
      ...fetcher
    }
  }
  const context = {
    dom: document,
    session: { store },
    environment
  }
  const pane = humanReadablePane.render(subject, context as any)
  document.body.appendChild(pane)
  return pane
}

async function expectAxeClean (pane: Element): Promise<void> {
  const results = await axe(pane)
  expect(results.violations).toHaveLength(0)
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('Human Readable accessibility', () => {
  it('keeps plain text accessible in the mobile layout', async () => {
    const pane = renderPane('text/plain', {
      webOperation: vi.fn().mockResolvedValue({ responseText: 'Readable text' })
    }, { layout: 'mobile' })

    await vi.waitFor(() => {
      expect(pane.querySelector('.human-readable-plain-text-preview')).not.toBeNull()
    })
    await expectAxeClean(pane)
  })

  it('keeps the preview keyboard focusable', async () => {
    const pane = renderPane('text/plain', {
      webOperation: vi.fn().mockResolvedValue({ responseText: 'Readable text' })
    })
    const preview = pane.querySelector('.human-readable-plain-text-preview') as HTMLElement

    await vi.waitFor(() => {
      expect(preview).toHaveAttribute('tabindex', '0')
    })
    preview.focus()
    expect(document.activeElement).toBe(preview)
    await expectAxeClean(pane)
  })

  it('keeps Markdown and JSON previews accessible', async () => {
    const markdown = renderPane('text/markdown', {
      webOperation: vi.fn().mockResolvedValue({ responseText: '# Markdown heading' })
    })
    await vi.waitFor(() => {
      expect(markdown.querySelector('h1')).not.toBeNull()
    })
    await expectAxeClean(markdown)

    const json = renderPane('application/json', {
      webOperation: vi.fn().mockResolvedValue({ responseText: '{"enabled":true}' })
    })
    await vi.waitFor(() => {
      expect(json.querySelector('.human-readable-json-preview')).not.toBeNull()
    })
    await expectAxeClean(json)
  })

  it('keeps invalid JSON errors and original content accessible', async () => {
    const pane = renderPane('application/json', {
      webOperation: vi.fn().mockResolvedValue({ responseText: '{ "value": 01 }' })
    })

    await vi.waitFor(() => {
      expect(pane.querySelector('solid-ui-error-state')).not.toBeNull()
    })
    expect(pane.querySelector('.human-readable-json-preview')).toHaveTextContent('{ "value": 01 }')
    await expectAxeClean(pane)
  })

  it('gives image and video previews accessible labels and controls', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:https://pod.example/media')
    const response = {
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(['media']))
    }
    const image = renderPane('image/png', {
      _fetch: vi.fn().mockResolvedValue(response)
    })
    await vi.waitFor(() => {
      expect(image.querySelector('img')).not.toBeNull()
    })
    expect(image.querySelector('img')).toHaveAttribute('alt', 'Image preview')
    await expectAxeClean(image)

    const videoResponse = {
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(['media']))
    }
    const video = renderPane('video/mp4', {
      _fetch: vi.fn().mockResolvedValue(videoResponse)
    })
    await vi.waitFor(() => {
      expect(video.querySelector('video')).not.toBeNull()
    })
    expect(video.querySelector('video')).toHaveAttribute('controls')
    expect(video.querySelector('video')).toHaveAttribute('playsinline')
    await expectAxeClean(video)
  })

  it('keeps the media error state accessible', async () => {
    const pane = renderPane('image/png', {
      _fetch: vi.fn().mockRejectedValue(new Error('network failure'))
    })

    await vi.waitFor(() => {
      expect(pane.querySelector('solid-ui-error-state')).not.toBeNull()
    })
    await expectAxeClean(pane)
  })
})
