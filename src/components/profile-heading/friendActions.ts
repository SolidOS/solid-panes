import { authn, store } from 'solid-logic'
import { st, type NamedNode } from 'rdflib'
import { ns } from 'solid-ui'
import { ensureStandardMutationPrefixes } from './editor/sections/shared/rdfMutationHelpers'
import { formatDisplayError } from './editor/utils/errorDisplay'

export const friendTexts = {
  add: 'Add as friend',
  exists: 'Already a friend',
  success: 'Friend was added!',
  duplicate: 'Friend already exists',
  loginRequired: 'Current user not found! Not logged in?'
}

function requireViewer (viewer: NamedNode): void {
  if (!authn.currentUser()?.sameTerm(viewer)) {
    throw new Error(friendTexts.loginRequired)
  }
}

export async function checkFriend (viewer: NamedNode, subject: NamedNode): Promise<boolean> {
  await store.fetcher.load(viewer)
  requireViewer(viewer)
  return store.whether(viewer, ns.foaf('knows'), subject, viewer.doc()) > 0
}

export async function addFriend (viewer: NamedNode, subject: NamedNode): Promise<void> {
  requireViewer(viewer)
  if (await checkFriend(viewer, subject)) throw new Error(friendTexts.duplicate)
  ensureStandardMutationPrefixes(store)
  try {
    await store.updater.update([], [st(viewer, ns.foaf('knows'), subject, viewer.doc())])
  } catch (error: unknown) {
    if (formatDisplayError(error).includes('Unauthenticated')) {
      throw new Error(friendTexts.loginRequired)
    }
    throw error
  }
}
