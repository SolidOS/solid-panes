import { describe, expect, it, vi } from 'vitest'
import * as $rdf from 'rdflib'
import solidNamespace from 'solid-namespace'
import { loadFriendshipTriage, triageFriends } from '../../../src/social/triage'

const ns = solidNamespace($rdf)

describe('triageFriends', () => {
  it('classifies confirmed, unconfirmed, and incoming requests', () => {
    const store = $rdf.graph()
    const alice = $rdf.sym('https://alice.example/profile/card#me')
    const bob = $rdf.sym('https://bob.example/profile/card#me')
    const carol = $rdf.sym('https://carol.example/profile/card#me')
    const dave = $rdf.sym('https://dave.example/profile/card#me')

    store.add(alice, ns.foaf('knows'), bob, alice.doc())
    store.add(alice, ns.foaf('knows'), carol, alice.doc())
    store.add(bob, ns.foaf('knows'), alice, bob.doc())
    store.add(dave, ns.foaf('knows'), alice, dave.doc())

    const triage = triageFriends(store, alice)

    expect(triage.acquaintances.map(node => node.value)).toEqual([
      bob.value,
      carol.value
    ])
    expect(triage.confirmed.map(node => node.value)).toEqual([bob.value])
    expect(triage.unconfirmed.map(node => node.value)).toEqual([carol.value])
    expect(triage.requests.map(node => node.value)).toEqual([dave.value])
  })

  it('deduplicates repeated incoming and outgoing statements', () => {
    const store = $rdf.graph()
    const alice = $rdf.sym('https://alice.example/profile/card#me')
    const bob = $rdf.sym('https://bob.example/profile/card#me')

    store.add(alice, ns.foaf('knows'), bob, alice.doc())
    store.add(alice, ns.foaf('knows'), bob, alice.doc())
    store.add(bob, ns.foaf('knows'), alice, bob.doc())
    store.add(bob, ns.foaf('knows'), alice, bob.doc())

    const triage = triageFriends(store, alice)

    expect(triage.acquaintances).toHaveLength(1)
    expect(triage.confirmed).toHaveLength(1)
    expect(triage.unconfirmed).toHaveLength(0)
    expect(triage.requests).toHaveLength(0)
  })
})

describe('loadFriendshipTriage', () => {
  it('recomputes triage after loading related profile documents', async () => {
    const store = $rdf.graph()
    const alice = $rdf.sym('https://alice.example/profile/card#me')
    const bob = $rdf.sym('https://bob.example/profile/card#me')
    const loadedTargets: string[] = []

    store.add(alice, ns.foaf('knows'), bob, alice.doc())

    const mockLoad: (target: $rdf.NamedNode | string) => Promise<unknown> = vi.fn(
      async (target: $rdf.NamedNode | string) => {
        const value = typeof target === 'string' ? target : target.value
        loadedTargets.push(value)
        if (value === bob.doc().value) {
          store.add(bob, ns.foaf('knows'), alice, bob.doc())
        }
      }
    )

    ;(store as typeof store & {
      fetcher?: unknown
    }).fetcher = {
      load: mockLoad
    } as unknown as typeof store.fetcher

    const triage = await loadFriendshipTriage(
      { session: { store } } as any,
      alice
    )

    expect(loadedTargets).toEqual(expect.arrayContaining([
      alice.doc().value,
      bob.doc().value
    ]))
    expect(triage.confirmed.map(node => node.value)).toEqual([bob.value])
    expect(triage.unconfirmed).toHaveLength(0)
  })
})
