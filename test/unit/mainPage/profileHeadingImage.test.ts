import { afterEach, describe, expect, it } from 'vitest'
import type ProfileHeading from '../../../src/components/profile-heading/ProfileHeading'
import '../../../src/components/profile-heading/ProfileHeading'

afterEach(() => {
  document.body.replaceChildren()
})

describe('profile heading image fallback', () => {
  it('retries an image source that failed earlier once the source changes and returns', async () => {
    const heading = document.createElement('solid-panes-profile-heading') as ProfileHeading
    heading.profileData = { name: 'Image Test', imageSrc: 'https://example.org/a.png' }
    document.body.appendChild(heading)
    await heading.updateComplete

    heading.shadowRoot?.querySelector('img')?.dispatchEvent(new Event('error'))
    await heading.updateComplete
    expect(heading.shadowRoot?.querySelector('img')).toBeNull()

    heading.profileData = { name: 'Image Test', imageSrc: 'https://example.org/b.png' }
    await heading.updateComplete
    expect(heading.shadowRoot?.querySelector('img')?.getAttribute('src')).toBe('https://example.org/b.png')

    heading.profileData = { name: 'Image Test', imageSrc: 'https://example.org/a.png' }
    await heading.updateComplete
    expect(heading.shadowRoot?.querySelector('img')?.getAttribute('src')).toBe('https://example.org/a.png')
  })
})
