import { DataBrowserContext } from 'pane-registry'
import { IndexedFormula, NamedNode } from 'rdflib'
import { ns } from 'solid-ui'

type FriendshipStore = IndexedFormula & {
  fetcher?: {
    load?: (target: NamedNode | string) => Promise<unknown>
  }
}

export interface FriendshipTriage {
  acquaintances: NamedNode[]
  confirmed: NamedNode[]
  unconfirmed: NamedNode[]
  requests: NamedNode[]
}

function uniqueNamedNodes (nodes: NamedNode[]): NamedNode[] {
  const seen = new Set<string>()
  const unique: NamedNode[] = []

  for (const node of nodes) {
    const key = node?.value
    if (!key || seen.has(key)) continue
    seen.add(key)
    unique.push(node)
  }

  return unique
}

export function triageFriends (store: FriendshipStore, subject: NamedNode): FriendshipTriage {
  const outgoingFriends = uniqueNamedNodes(store.each(subject, ns.foaf('knows')) as NamedNode[])
  const incomingFriends = uniqueNamedNodes(
    store.each(undefined, ns.foaf('knows'), subject) as NamedNode[]
  )
  const confirmed: NamedNode[] = []
  const unconfirmed: NamedNode[] = []
  const requests: NamedNode[] = []

  for (const friend of outgoingFriends) {
    const isConfirmed = incomingFriends.some(incomingFriend => incomingFriend.sameTerm(friend))
    if (isConfirmed) {
      confirmed.push(friend)
    } else {
      unconfirmed.push(friend)
    }
  }

  for (const friend of incomingFriends) {
    const isAlreadyOutgoing = outgoingFriends.some(outgoingFriend => outgoingFriend.sameTerm(friend))
    if (!isAlreadyOutgoing) {
      requests.push(friend)
    }
  }

  return {
    acquaintances: outgoingFriends,
    confirmed,
    unconfirmed,
    requests
  }
}

export async function loadFriendshipTriage (
  context: DataBrowserContext,
  subject: NamedNode
): Promise<FriendshipTriage> {
  const store = context.session.store as FriendshipStore
  const fetcher = store.fetcher

  if (!fetcher || typeof fetcher.load !== 'function') {
    return triageFriends(store, subject)
  }

  try {
    await fetcher.load(subject.doc())
  } catch {
    // Continue with the store snapshot we already have.
  }

  const initialTriage = triageFriends(store, subject)
  const documentsToLoad = new Map<string, NamedNode | string>()

  documentsToLoad.set(subject.doc().value, subject.doc())

  for (const friend of [...initialTriage.acquaintances, ...initialTriage.requests]) {
    documentsToLoad.set(friend.doc().value, friend.doc())
  }

  const incomingStatements = store.statementsMatching(undefined, ns.foaf('knows'), subject)
  for (const statement of incomingStatements) {
    const why = statement.why as NamedNode | undefined
    if (why?.value) {
      documentsToLoad.set(why.value, why)
    }
  }

  for (const target of documentsToLoad.values()) {
    try {
      await fetcher.load(target)
    } catch {
      // Keep partial results when one profile document fails to load.
    }
  }

  return triageFriends(store, subject)
}
