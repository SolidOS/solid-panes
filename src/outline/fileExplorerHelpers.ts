import * as UI from 'solid-ui'
import type { DataBrowserContext, PaneDefinition } from 'pane-registry'
import type { NamedNode } from 'rdflib'
import personIcon from '../icons/person.svg'
import friendsIcon from '../icons/friends.svg'

type ExplorerPane = Omit<PaneDefinition, 'icon'> & {
  icon: string | ((subject: NamedNode, context: DataBrowserContext) => string | undefined)
}

export function getPaneIcon (
  pane: ExplorerPane | undefined,
  subject: NamedNode,
  context: DataBrowserContext
) {
  if (!pane) return undefined

  return typeof pane.icon === 'function'
    ? pane.icon(subject, context)
    : pane.icon
}

export async function getPaneItems (
  subject: NamedNode,
  context: DataBrowserContext,
  relevantPanes: ExplorerPane[],
  dispatchOpenPane: ((subject: NamedNode, paneName: string) => void) | undefined
) {
  if (typeof dispatchOpenPane !== 'function') return []

  return UI.preparePaneMenuItems({
    subject,
    context,
    panes: relevantPanes,
    iconOverrides: {
      profile: () => personIcon,
      social: () => friendsIcon
    },
    openPane: (paneSubject, paneName) => dispatchOpenPane(paneSubject, paneName)
  })
}
