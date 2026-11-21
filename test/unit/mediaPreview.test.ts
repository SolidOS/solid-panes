import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  isImageContentType,
  isVideoContentType,
  renderImageContent,
  renderVideoContent
} from '../../src/humanReadable/mediaPreview'

const objectUrl = 'blob:https://pod.example/media'

function mediaStore (response: Record<string, unknown> = {}) {
  return {
    fetcher: {
      _fetch: vi.fn().mockResolvedValue({
        ok: true,
        blob: vi.fn().mockResolvedValue(new Blob(['media'])),
        ...response
      })
    }
  } as any
}

function renderTarget () {
  const frame = document.createElement('div')
  const status = document.createElement('div')
  document.body.append(frame, status)
  return { frame, status }
}

afterEach(() => {
  document.body.replaceChildren()
  vi.restoreAllMocks()
})

describe('media content detection', () => {
  it('detects image and video content types with parameters', () => {
    expect(isImageContentType('image/png; charset=binary')).toBe(true)
    expect(isVideoContentType('video/mp4')).toBe(true)
    expect(isImageContentType('text/plain')).toBe(false)
    expect(isVideoContentType(null)).toBe(false)
  })
})

describe('media preview rendering', () => {
  it('renders an accessible image in the shared preview frame', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(objectUrl)
    const { frame, status } = renderTarget()

    renderImageContent(mediaStore(), { uri: 'https://pod.example/image.png' } as any, frame, status)
    await vi.waitFor(() => expect(frame.querySelector('img')).not.toBeNull())

    expect(frame.className).toContain('human-readable-image-preview')
    expect(frame.querySelector('img')?.getAttribute('alt')).toBe('Image preview')
    expect(frame.querySelector('img')?.getAttribute('src')).toBe(objectUrl)
  })

  it('renders a controlled inline video in the shared preview frame', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(objectUrl)
    const { frame, status } = renderTarget()

    renderVideoContent(mediaStore(), { uri: 'https://pod.example/video.mp4' } as any, frame, status)
    await vi.waitFor(() => expect(frame.querySelector('video')).not.toBeNull())

    expect(frame.className).toContain('human-readable-video-preview')
    expect(frame.querySelector('video')?.hasAttribute('controls')).toBe(true)
    expect(frame.querySelector('video')?.hasAttribute('playsinline')).toBe(true)
  })

  it('uses the shared error state when media loading fails', async () => {
    const { frame, status } = renderTarget()
    renderImageContent(mediaStore({ ok: false, status: 401 }), { uri: 'https://pod.example/image.png' } as any, frame, status)

    await vi.waitFor(() => expect(status.querySelector('solid-ui-error-state')).not.toBeNull())
    expect(frame.childElementCount).toBe(0)
  })
})
