import * as paneRegistry from 'pane-registry'
import folderIcon from '../icons/folder.svg'
import personIcon from '../icons/person.svg'
import friendsIcon from '../icons/friends.svg'
import { loadProfileFromURI } from './webIdUtils'
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
      return pane.render(subject, context, options)
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
  icon = ''
): Promise<PaneItem | null> {
  const windowHref = new URL(window.location.href)
  const finalURL = subject || sym(windowHref.toString())
  const webId = await loadProfileFromURI(finalURL)
  if (!webId || !webId.value) return null

  const pane = paneRegistry.byName(paneName)
  if (!pane) return null

  return createPaneItem(pane, webId, paneName, labelText, icon)
}

export async function getProfilePaneFromURI (subject?: NamedNode) {
  return getPaneItemFromURI('profile', subject, 'Profile', PERSON_ICON)
}

export async function getSocialPaneFromURI (subject?: NamedNode) {
  return getPaneItemFromURI('social', subject, 'Social', FRIENDS_ICON)
}

export async function getFolderPaneFromURI (podUrl: NamedNode) {
  return getFolderPaneforStorage(podUrl)
}

export function createFolderPaneItem (folderPane: any, pod: NamedNode) {
  return createPaneItem(folderPane, pod, folderPane.name, 'Storage', FOLDER_ICON)
}

export async function getFolderPaneforStorage (podUrl: NamedNode) {
  const folderPane = paneRegistry.byName('folder')
  if (!folderPane) return []

  return createFolderPaneItem(folderPane, podUrl)
}
