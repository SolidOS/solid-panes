import { describe, expect, it, vi } from 'vitest'
import { imagePane } from '../../src/imagePane'

function contextFor (contentType?: string) {
  const subject = { uri: 'https://pod.example/image.png' }
  const store = {
    anyStatementMatching: vi.fn().mockReturnValue(false),
    sym: vi.fn((uri: string) => ({ uri })),
    fetcher: {
      getHeader: vi.fn().mockReturnValue(contentType ? [contentType] : undefined)
    }
  }
  return {
    subject,
    context: { session: { store } } as any
  }
}

describe('image pane', () => {
  it('claims image resources based on their response content type', () => {
    const { subject, context } = contextFor('image/png')

    expect(imagePane.label(subject as any, context)).toBe('Image')
  })

  it('does not claim non-image resources without an image RDF type', () => {
    const { subject, context } = contextFor('text/html')

    expect(imagePane.label(subject as any, context)).toBeNull()
  })
})
