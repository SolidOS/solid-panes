import { afterEach, describe, expect, it, vi } from 'vitest'
import { authn, store } from 'solid-logic'
import { sym } from 'rdflib'
import { ns } from 'solid-ui'
import { isInViewerPod } from '../../../src/utils/podUtils'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('isInViewerPod', () => {
  const viewer = sym('https://pod.example/timea/profile/card#me')
  const storage = sym('https://pod.example/timea/')

  function viewerWithStorage () {
    vi.spyOn(store.fetcher, 'load').mockResolvedValue(undefined as never)
    store.add(viewer, ns.space('storage'), storage, viewer.doc())
    store.add(storage, ns.rdf('type'), ns.space('Storage'), storage.doc())
    // Known contents mean the container does not need fetching again
    store.add(storage, ns.ldp('contains'), sym('https://pod.example/timea/docs/'), storage.doc())
  }

  it('is true for URLs inside the viewer\'s storage', async () => {
    viewerWithStorage()
    vi.spyOn(authn, 'currentUser').mockReturnValue(viewer)

    expect(await isInViewerPod('https://pod.example/timea/docs/file.ttl')).toBe(true)
    expect(await isInViewerPod('https://pod.example/timea/')).toBe(true)
  })

  it('is false for URLs in other pods or outside the storage', async () => {
    viewerWithStorage()
    vi.spyOn(authn, 'currentUser').mockReturnValue(viewer)

    expect(await isInViewerPod('https://pod.example/timea2/profile/card')).toBe(false)
    expect(await isInViewerPod('https://other.example/timea/docs/')).toBe(false)
  })

  it('is false when nobody is logged in', async () => {
    viewerWithStorage()
    vi.spyOn(authn, 'currentUser').mockReturnValue(null)

    expect(await isInViewerPod('https://pod.example/timea/docs/')).toBe(false)
  })
})
