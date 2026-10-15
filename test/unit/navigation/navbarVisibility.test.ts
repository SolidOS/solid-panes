import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isPageInViewerPod } from '../../../src/navigation/podContext'
import { refreshNavbarVisibility, setNavbarHidden } from '../../../src/navigation/navbarVisibility'

vi.mock('../../../src/navigation/podContext', () => ({
  isPageInViewerPod: vi.fn()
}))
vi.mock('../../../src/utils/webIdUtils', () => ({
  isOwnWebIdProfile: () => false
}))

beforeEach(() => {
  document.body.appendChild(document.createElement('solid-panes-navbar'))
})

afterEach(() => {
  setNavbarHidden(false)
  vi.resetAllMocks()
  document.body.replaceChildren()
})

describe('navbar ownership lookup races', () => {
  it('ignores a lookup completed after a newer navigation', async () => {
    let finishFirst!: (owned: boolean) => void
    vi.mocked(isPageInViewerPod)
      .mockReturnValueOnce(new Promise(resolve => { finishFirst = resolve }))
      .mockResolvedValueOnce(true)

    const first = refreshNavbarVisibility('https://other.example/file')
    await refreshNavbarVisibility('https://own.example/file')
    finishFirst(false)
    await first

    expect(document.querySelector('solid-panes-navbar')).toHaveClass('navbar--hidden')
  })

  it('does not undo account-menu hiding when an earlier lookup finishes', async () => {
    let finish!: (owned: boolean) => void
    vi.mocked(isPageInViewerPod).mockReturnValueOnce(new Promise(resolve => { finish = resolve }))

    const pending = refreshNavbarVisibility('https://other.example/file')
    setNavbarHidden(true)
    finish(false)
    await pending

    expect(document.querySelector('solid-panes-navbar')).toHaveClass('navbar--hidden')
  })
})
