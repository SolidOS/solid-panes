import * as paneRegistry from 'pane-registry'
import folderIcon from '../icons/folder.svg'
import personIcon from '../icons/person.svg'
import friendsIcon from '../icons/friends.svg'
import { isWebIdUri, loadProfileFromURI } from './webIdUtils'
import { getPodStorages } from './podUtils'
import { NamedNode, sym } from 'rdflib'

const FOLDER_ICON = folderIcon
const PERSON_ICON = personIcon
const FRIENDS_ICON = friendsIcon

export type PaneItem = {
  name: string
  paneName: string
  tabName?: string
  label: () => string
  render: (subject: NamedNode, context: any, options: any) => any
  shouldGetFocus: () => boolean
  requireQueryButton: boolean
  subject: NamedNode
  icon: string
}

type PaneLookup = (name: string) => any

export function createPaneItem (
  pane: any,
  subject: NamedNode,
  paneName: string,
  labelText: string,
  icon: string,
  tabName?: string
): PaneItem {
  return {
    name: pane.name,
    paneName,
    tabName,
    label: function () {
      return labelText
    },
    render: function (_subject, context, options) {
      // Storage is an explicit browser view, even though GotoSubject uses solo for top-level navigation.
      return pane.render(subject, context, paneName === 'folder' ? { ...options, solo: false, fullView: false } : options)
    },
    shouldGetFocus: function () {
      return false
    },
    requireQueryButton: !!pane.requireQueryButton,
    subject,
    icon
  }
}

export async function getPaneItemFromURI (
  paneName: string,
  subject?: NamedNode,
  labelText = 'Pane',
  icon = '',
  byName: PaneLookup = paneRegistry.byName
): Promise<PaneItem | null> {
  const windowHref = new URL(window.location.href)
  const finalURL = subject || sym(windowHref.toString())
  const webId = await loadProfileFromURI(finalURL)
  if (!webId || !webId.value) return null

  const pane = byName(paneName)
  if (!pane) return null

  return createPaneItem(pane, webId, paneName, labelText, icon)
}

export async function getProfilePaneFromURI (subject?: NamedNode, byName: PaneLookup = paneRegistry.byName) {
  if (subject && isWebIdUri(subject)) {
    const pane = byName('profile')
    return pane
      ? createPaneItem(pane, subject, 'profile', 'Profile', PERSON_ICON)
      : null
  }
  return getPaneItemFromURI('profile', subject, 'Profile', PERSON_ICON, byName)
}

export async function getSocialPaneFromURI (subject?: NamedNode, byName: PaneLookup = paneRegistry.byName) {
  return getPaneItemFromURI('social', subject, 'Social', FRIENDS_ICON, byName)
}

export async function getFolderPaneForStorage (podUrl: NamedNode, label?: string): Promise<PaneItem | null> {
  const folderPane = paneRegistry.byName('folder')
  if (!folderPane) return null

  return createPaneItem(folderPane, podUrl, folderPane.name, label || 'Storage', FOLDER_ICON)
}
export async function getFolderPanesFromURI (subject: NamedNode): Promise<PaneItem[]> {
  const podStorages = await getPodStorages(subject)
  if (podStorages.length === 0) return []

  return Promise.all(
    podStorages.map((pod, index) =>
      getFolderPaneForStorage(
        pod,
        podStorages.length > 1 ? `Storage ${index + 1}` : 'Storage'
      )
    )
  ).then(panes => panes.filter((pane): pane is PaneItem => pane !== null))
}
