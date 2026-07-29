import * as paneRegistry from 'pane-registry'
import friendsIcon from '../icons/friends.svg'
import { NamedNode, sym } from 'rdflib'
import { loadProfileFromURI } from './webIdUtils'

const FRIENDS_ICON = friendsIcon

// returns the social pane given subject (or the current URL subject if none is provided), if any. If not, returns an empty array.
export async function getSocialPaneFromURI (subject?: NamedNode) {
  const windowHref = (new URL(window.location.href))
  const finalURL = subject || sym(windowHref.toString())
  const webId = await loadProfileFromURI(finalURL)
  if (!webId || !webId.value) return []

  const socialPane = paneRegistry.byName('social')
  if (!socialPane) return []

  return createSocialPaneItem(socialPane, webId)
}

export function createSocialPaneItem (socialPane, webId: NamedNode) {
  return {
    name: socialPane.name,
    paneName: 'social',
    label: function () {
      return 'Social'
    },
    render: function (_subject, context, options) {
      return socialPane.render(webId, context, options)
    },
    shouldGetFocus: function () {
      return false
    },
    requireQueryButton: !!socialPane.requireQueryButton,
    subject: webId,
    icon: FRIENDS_ICON
  }
}
