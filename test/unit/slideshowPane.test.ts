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
  it('requires at least two images', () => {
    const { subject, context } = contextFor([{ uri: 'one.png', image: true }])

    expect(slideshowPane.label(subject as any, context)).toBeNull()
  })

  it('rejects containers containing non-image resources', () => {
    const { subject, context } = contextFor([
      { uri: 'one.png', image: true },
      { uri: 'notes.txt', image: false }
    ])

    expect(slideshowPane.label(subject as any, context)).toBeNull()
  })

  it('accepts containers containing multiple images only', () => {
    const { subject, context } = contextFor([
      { uri: 'one.png', image: true },
      { uri: 'two.png', image: true }
    ])

    expect(slideshowPane.label(subject as any, context)).toBe('Slideshow')
  })
})
