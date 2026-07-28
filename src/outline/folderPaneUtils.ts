import * as paneRegistry from 'pane-registry'
import { getPodStorages } from './podUtils'
import folderIcon from '../icons/folder.svg'
import { NamedNode } from 'rdflib'

const FOLDER_ICON = folderIcon

// returns the folder pane of the pods of the given subject (or the current URL subject if none is provided), if any. If not, returns an empty array.
export async function getFolderPaneforStorage (subject?: NamedNode) {
  const uri = (new URL(window.location.href)).searchParams.get('uri')
  const podUrl = subject?.uri || uri || window.location.href
  const podStorages = await getPodStorages(podUrl)
  if (!podStorages.length) return []

  const folderPane = paneRegistry.byName('folder')
  if (!folderPane) return []

  return podStorages.map((pod, index) => createFolderPaneItem(folderPane, pod, index))
}

export function createFolderPaneItem (folderPane, pod: NamedNode, index: number) {
  return {
    name: folderPane.name,
    paneName: 'folder',
    tabName: `folder-${index}`,
    label: function () {
      return 'Storage'
    },
    render: function (_subject, context, options) {
      return folderPane.render(pod, context, options)
    },
    shouldGetFocus: function () {
      return false
    },
    requireQueryButton: !!folderPane.requireQueryButton,
    subject: pod,
    icon: FOLDER_ICON
  }
}
