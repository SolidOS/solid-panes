import { describe, expect, it, vi } from 'vitest'

const resource = vi.hoisted(() => ({
  isContainer: vi.fn(() => true),
  isImage: vi.fn((file: { image?: boolean }) => file.image === true)
}))

vi.mock('solid-logic', async importOriginal => {
  const actual = await importOriginal<typeof import('solid-logic')>()
  return {
    ...actual,
    solidLogicSingleton: { ...actual.solidLogicSingleton, resource }
  }
})

import { slideshowPane } from '../../src/slideshow/slideshowPane'

function contextFor (contents: Array<{ uri: string, image?: boolean }>) {
  const subject = { uri: 'https://pod.example/photos/' }
  const store = {
    each: vi.fn(() => contents)
  }
  return { subject, context: { session: { store } } as any }
}

describe('slideshow pane', () => {
  it('offers Slideshow for a container with one image', () => {
    const { subject, context } = contextFor([{ uri: 'one.png', image: true }])

    expect(slideshowPane.label(subject as any, context)).toBe('Slideshow')
  })

  it.each([
    { contents: [] },
    { contents: [{ uri: 'notes.txt', image: false }] }
  ])('does not offer Slideshow without images: $contents', ({ contents }) => {
    const { subject, context } = contextFor(contents)

    expect(slideshowPane.label(subject as any, context)).toBeNull()
  })

  it('does not offer Slideshow for an individual image resource', () => {
    const { subject, context } = contextFor([{ uri: 'one.png', image: true }])
    resource.isContainer.mockReturnValueOnce(false)

    expect(slideshowPane.label(subject as any, context)).toBeNull()
  })

  it('accepts containers containing multiple images and other resources', () => {
    const { subject, context } = contextFor([
      { uri: 'one.png', image: true },
      { uri: 'notes.txt', image: false },
      { uri: 'two.png', image: true }
    ])

    expect(slideshowPane.label(subject as any, context)).toBe('Slideshow')
  })

  it('accepts containers containing multiple images only', () => {
    const { subject, context } = contextFor([
      { uri: 'one.png', image: true },
      { uri: 'two.png', image: true }
    ])

    expect(slideshowPane.label(subject as any, context)).toBe('Slideshow')
  })
})
