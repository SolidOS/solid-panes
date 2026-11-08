import { solidLogicSingleton, store } from 'solid-logic'
import { NamedNode } from 'rdflib'
import { getViewerRelation } from '../../utils/viewerUtils'
import type { ProfileDetails } from './editor/sections/heading/types'
import type { ViewerMode } from '../../types'

export async function getViewerMode (subject: NamedNode): Promise<ViewerMode> {
  const relation = getViewerRelation(subject)
  if (relation !== 'owner') return relation

  try {
    return store.updater?.editable?.(subject.doc()) ? 'owner' : 'anonymous'
  } catch (error) {
    console.warn('Failed to check profile edit permissions.', error)
    return 'anonymous'
  }
}

export function presentProfile (subject: NamedNode, _profileStore = store): ProfileDetails {
  return solidLogicSingleton.profile.getHeading(subject)
}
