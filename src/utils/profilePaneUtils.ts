import * as paneRegistry from 'pane-registry'
import personIcon from '../icons/person.svg'
import { NamedNode, sym } from 'rdflib'
import { store } from 'solid-logic'
import { loadProfileFromURI } from './webIdUtils'

const PERSON_ICON = personIcon

// returns the profile pane given subject (or the current URL subject if none is provided), if any. If not, returns an empty array.
export async function getProfilePaneFromURI (subject?: NamedNode) {
  const windowHref = (new URL(window.location.href))
  const finalURL = subject || sym(windowHref.toString())
  const webId = await loadProfileFromURI(finalURL, store, store.fetcher)
  if (!webId || !webId.value) return []

  const profilePane = paneRegistry.byName('profile')
  if (!profilePane) return []

  return createProfilePaneItem(profilePane, webId)
}

export function createProfilePaneItem (profilePane, webId: NamedNode) {
  return {
    name: profilePane.name,
    paneName: 'profile',
    label: function () {
      return 'Profile'
    },
    render: function (_subject, context, options) {
      return profilePane.render(webId, context, options)
    },
    shouldGetFocus: function () {
      return false
    },
    requireQueryButton: !!profilePane.requireQueryButton,
    subject: webId,
    icon: PERSON_ICON
  }
}
