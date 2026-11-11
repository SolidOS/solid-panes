import { describe, expect, it, vi } from 'vitest'
import { sym } from 'rdflib'
import { uploadPhotoFile } from '../../../src/components/profile-heading/editor/sections/heading/imageHelpers'

describe('photo upload destinations', () => {
  it('skips an existing unlinked resource and creates conditionally', async () => {
    const webOperation = vi.fn()
      .mockResolvedValueOnce({ status: 200, ok: true, statusText: 'OK' })
      .mockResolvedValueOnce({ status: 201, ok: true, statusText: 'Created' })
    const store = {
      fetcher: { webOperation },
      holds: vi.fn(() => false)
    }
    const file = new File(['image'], 'avatar.png', { type: 'image/png' })
    const subject = sym('https://pod.example/profile/card#me')

    await expect(uploadPhotoFile(store as never, subject, file))
      .resolves.toMatch(/^https:\/\/pod\.example\/profile\/image_\d+_[01]_[a-z0-9]+\.png$/)

    expect(webOperation).toHaveBeenNthCalledWith(
      1,
      'HEAD',
      'https://pod.example/profile/avatar.png'
    )
    expect(webOperation).toHaveBeenNthCalledWith(
      2,
      'PUT',
      expect.stringMatching(/^https:\/\/pod\.example\/profile\/image_\d+_[01]_[a-z0-9]+\.png$/),
      expect.objectContaining({
        contentType: 'image/png',
        headers: { 'If-None-Match': '*' }
      })
    )
  })

  it('retries with a fallback name when conditional creation loses a race', async () => {
    const webOperation = vi.fn()
      .mockResolvedValueOnce({ status: 404, ok: false, statusText: 'Not Found' })
      .mockResolvedValueOnce({ status: 412, ok: false, statusText: 'Precondition Failed' })
      .mockResolvedValueOnce({ status: 201, ok: true, statusText: 'Created' })
    const store = {
      fetcher: { webOperation },
      holds: vi.fn(() => false)
    }
    const file = new File(['image'], 'avatar.png', { type: 'image/png' })
    const subject = sym('https://pod.example/profile/card#me')

    await expect(uploadPhotoFile(store as never, subject, file))
      .resolves.toMatch(/^https:\/\/pod\.example\/profile\/image_\d+_[01]_[a-z0-9]+\.png$/)

    expect(webOperation).toHaveBeenNthCalledWith(
      3,
      'PUT',
      expect.stringMatching(/^https:\/\/pod\.example\/profile\/image_\d+_[01]_[a-z0-9]+\.png$/),
      expect.objectContaining({ headers: { 'If-None-Match': '*' } })
    )
  })

  it('skips a linked inaccessible resource without checking it', async () => {
    const webOperation = vi.fn()
      .mockResolvedValue({ status: 201, ok: true, statusText: 'Created' })
    let holdsCalls = 0
    const store = {
      fetcher: { webOperation },
      holds: vi.fn(() => holdsCalls++ < 1)
    }
    const file = new File(['image'], 'avatar.png', { type: 'image/png' })
    const subject = sym('https://pod.example/profile/card#me')

    await expect(uploadPhotoFile(store as never, subject, file))
      .resolves.toMatch(/^https:\/\/pod\.example\/profile\/image_\d+_\d+_[a-z0-9]+\.png$/)

    expect(webOperation.mock.calls.filter(([method]) => method === 'HEAD')).toHaveLength(0)
    expect(webOperation).toHaveBeenCalledWith(
      'PUT',
      expect.stringMatching(/^https:\/\/pod\.example\/profile\/image_\d+_\d+_[a-z0-9]+\.png$/),
      expect.objectContaining({ headers: { 'If-None-Match': '*' } })
    )
  })

  it('advances after a thrown 412 without rescanning prior names', async () => {
    const conditionalError = Object.assign(new Error('Precondition Failed'), { status: 412 })
    const webOperation = vi.fn()
      .mockResolvedValueOnce({ status: 404, ok: false, statusText: 'Not Found' })
      .mockRejectedValueOnce(conditionalError)
      .mockResolvedValueOnce({ status: 201, ok: true, statusText: 'Created' })
    const store = {
      fetcher: { webOperation },
      holds: vi.fn(() => false)
    }
    const file = new File(['image'], 'avatar.png', { type: 'image/png' })
    const subject = sym('https://pod.example/profile/card#me')

    await expect(uploadPhotoFile(store as never, subject, file))
      .resolves.toMatch(/^https:\/\/pod\.example\/profile\/image_\d+_0_[a-z0-9]+\.png$/)

    expect(webOperation).toHaveBeenCalledTimes(3)
    expect(webOperation.mock.calls.filter(([method]) => method === 'HEAD')).toHaveLength(1)
  })
})
