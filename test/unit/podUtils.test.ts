import { afterEach, describe, expect, it, vi } from 'vitest'
import { store } from 'solid-logic'
import { ns } from 'solid-ui'
import { sym } from 'rdflib'
import { getPodStorages } from '../../src/utils/podUtils'

describe('getPodStorages', () => {
  const webId = sym('https://pod.example/profile/card#me')
  const storage = sym('https://pod.example/')

  afterEach(() => {
    vi.restoreAllMocks()
    store.removeMatches(webId, ns.space('storage'), null, webId.doc())
    store.removeMatches(storage, null, null, storage.doc())
  })

  it('uses a storage declared by the WebID profile without requiring a Storage type response', async () => {
    vi.spyOn(store.fetcher, 'load').mockImplementation(async () => {
      store.add(webId, ns.space('storage'), storage, webId.doc())
      return [] as never
    })
    const webOperation = vi.spyOn(store.fetcher, 'webOperation')

    await expect(getPodStorages(webId)).resolves.toEqual([storage])
    expect(webOperation).not.toHaveBeenCalled()
  })
})
