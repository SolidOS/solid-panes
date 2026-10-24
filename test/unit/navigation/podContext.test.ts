import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sym } from 'rdflib'
import { authn } from 'solid-logic'
import type { PaneItem } from '../../../src/utils/paneUtils'

const { loadProfile, getFolderPanes, getStorages } = vi.hoisted(() => ({
  loadProfile: vi.fn(),
  getFolderPanes: vi.fn(),
  getStorages: vi.fn()
}))

vi.mock('../../../src/utils/webIdUtils', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../../src/utils/webIdUtils')>(),
  loadProfileFromURI: loadProfile
}))
vi.mock('../../../src/utils/paneUtils', () => ({ getFolderPanesFromURI: getFolderPanes }))
vi.mock('../../../src/utils/podUtils', () => ({ getPodStorages: getStorages }))

import {
  getPodContext,
  isInViewerPod,
  isPageInViewerPod,
  isSamePod,
  resetPodContexts,
  type PodContext
} from '../../../src/navigation/podContext'

const owner = sym('https://pod.example/timea/profile/card#me')
const viewer = sym('https://pod.example/other/profile/card#me')
const storage = (uri: string) => ({ subject: sym(uri), paneName: 'folder' }) as unknown as PaneItem

beforeEach(() => {
  resetPodContexts()
  loadProfile.mockResolvedValue(owner)
  getFolderPanes.mockResolvedValue([storage('https://pod.example/timea/')])
  getStorages.mockResolvedValue([sym('https://pod.example/other/')])
  vi.spyOn(authn, 'currentUser').mockReturnValue(viewer)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.resetAllMocks()
})

describe('getPodContext', () => {
  it('describes the pod the page is in and the viewer\'s own storages', async () => {
    const context = await getPodContext('https://pod.example/timea/docs/')

    expect(context).toMatchObject({
      viewer: viewer.value,
      owner: owner.value,
      viewerStorages: ['https://pod.example/other/']
    })
    expect(context.storagePanes.map(pane => pane.subject.value)).toEqual(['https://pod.example/timea/'])
    expect(getFolderPanes).toHaveBeenCalledWith(owner)
  })

  it('looks up the storages of a pod and of the viewer once, however many of its pages are asked about', async () => {
    await Promise.all([
      getPodContext('https://pod.example/timea/a'),
      getPodContext('https://pod.example/timea/b/c'),
      getPodContext('https://pod.example/timea/')
    ])

    expect(getFolderPanes).toHaveBeenCalledOnce()
    expect(getStorages).toHaveBeenCalledOnce()
  })

  it('looks up the owner once per document, whatever fragment is asked about', async () => {
    await Promise.all([
      getPodContext('https://pod.example/timea/a'),
      getPodContext('https://pod.example/timea/a#one'),
      getPodContext('https://pod.example/timea/a#two')
    ])
    await getPodContext('https://pod.example/timea/b')

    expect(loadProfile).toHaveBeenCalledTimes(2)
  })

  it('gives each page its own owner, since the lookup can end with that page\'s own primary topic', async () => {
    const alice = sym('https://example.org/people/alice#me')
    const bob = sym('https://example.org/people/bob#me')
    loadProfile.mockImplementation(async (subject: typeof alice) => subject.uri.includes('alice') ? alice : bob)

    const first = await getPodContext('https://example.org/people/alice')
    const second = await getPodContext('https://example.org/people/bob')

    expect([first.owner, second.owner]).toEqual([alice.value, bob.value])
    expect(isSamePod(first, second)).toBe(false)
  })

  it('looks up the storages again for another pod, on the same host or another one', async () => {
    await getPodContext('https://pod.example/timea/')
    await getPodContext('https://pod.example/timea2/')
    await getPodContext('https://elsewhere.example/timea/')

    expect(getFolderPanes).toHaveBeenCalledTimes(3)
    expect(loadProfile).toHaveBeenCalledTimes(3)
  })

  it('looks up the viewer\'s storages once per viewer, and the rest is unaffected by who is logged in', async () => {
    await getPodContext('https://pod.example/timea/')
    vi.mocked(authn.currentUser).mockReturnValue(null)

    const loggedOut = await getPodContext('https://pod.example/timea/')

    expect(loggedOut.viewer).toBeUndefined()
    expect(loggedOut.viewerStorages).toEqual([])
    expect(loggedOut.owner).toBe(owner.value)
    expect(loadProfile).toHaveBeenCalledOnce()
    expect(getStorages).toHaveBeenCalledOnce()
  })

  it('does not remember an unbounded number of documents', async () => {
    for (let index = 0; index < 520; index++) await getPodContext(`https://pod.example/timea/doc-${index}`)
    loadProfile.mockClear()

    await getPodContext('https://pod.example/timea/doc-519')
    expect(loadProfile).not.toHaveBeenCalled()
    await getPodContext('https://pod.example/timea/doc-0')
    expect(loadProfile).toHaveBeenCalledOnce()
  })

  it('uses the page URL by default', async () => {
    window.history.replaceState({}, '', '/timea/docs/')

    await getPodContext()

    expect(loadProfile).toHaveBeenCalledWith(sym(window.location.href))
    window.history.replaceState({}, '', '/')
  })

  describe('when a lookup finds no profile', () => {
    it('does not take the URL itself for the owner', async () => {
      const page = sym('https://pod.example/files/notes.ttl')
      loadProfile.mockResolvedValue(page)

      expect((await getPodContext(page.uri)).owner).toBeUndefined()
    })

    it('does take a WebID for its own owner', async () => {
      loadProfile.mockResolvedValue(owner)

      expect((await getPodContext(owner.uri)).owner).toBe(owner.value)
    })
  })

  describe('when a lookup fails', () => {
    beforeEach(() => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    })

    it('still describes what could be loaded', async () => {
      loadProfile.mockRejectedValue(new Error('offline'))

      const context = await getPodContext('https://pod.example/timea/')

      expect(context.owner).toBeUndefined()
      expect(context.storagePanes).toHaveLength(1)
    })

    it('asks again next time instead of remembering the gap', async () => {
      loadProfile.mockRejectedValueOnce(new Error('offline'))

      await getPodContext('https://pod.example/timea/')
      const retried = await getPodContext('https://pod.example/timea/')

      expect(retried.owner).toBe(owner.value)
      expect(loadProfile).toHaveBeenCalledTimes(2)
    })

    it('does not look up the viewer\'s storages when nobody is logged in', async () => {
      vi.mocked(authn.currentUser).mockReturnValue(null)
      getStorages.mockRejectedValue(new Error('not called'))

      const context = await getPodContext('https://pod.example/timea/')

      expect(context.viewerStorages).toEqual([])
      expect(getStorages).not.toHaveBeenCalled()
    })
  })
})

describe('what a context says about a URL', () => {
  const context: PodContext = {
    viewer: viewer.value,
    owner: owner.value,
    storagePanes: [],
    viewerStorages: ['https://pod.example/other/']
  }

  it.each([
    ['https://pod.example/other/', true],
    ['https://pod.example/other/docs/file.ttl', true],
    ['https://pod.example/timea/docs/', false],
    ['https://pod.example/others/', false]
  ])('puts %s in the viewer\'s pod: %s', (url, expected) => {
    expect(isInViewerPod(context, url)).toBe(expected)
  })

  it('compares pods by owner, viewer and storages', () => {
    const same = { ...context, storagePanes: [storage('https://pod.example/timea/')] }

    expect(isSamePod(same, { ...same })).toBe(true)
    expect(isSamePod(same, { ...same, owner: 'https://elsewhere.example/profile/card#me' })).toBe(false)
    expect(isSamePod(same, { ...same, viewer: undefined })).toBe(false)
    expect(isSamePod(same, { ...same, storagePanes: [] })).toBe(false)
  })

  it('answers for a page URL directly', async () => {
    expect(await isPageInViewerPod('https://pod.example/other/docs/')).toBe(true)
    expect(await isPageInViewerPod('https://pod.example/timea/')).toBe(false)
  })
})
