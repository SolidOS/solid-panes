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
  openPane: ((subject: NamedNode, paneName: string) => void) | undefined
) {
  if (typeof openPane !== 'function') return []

  const menuItems = await Promise.all(relevantPanes.map(async pane => {
    const label = pane.label(subject, context)
    if (!label) return undefined

    let iconSrc: string | undefined
    if (pane.name === 'profile') {
      iconSrc = personIcon
    } else if (pane.name === 'social') {
      iconSrc = friendsIcon
    } else {
      iconSrc = await getPaneIcon(pane, subject, context) || undefined
    }

    const icon = UI.utils.AJARImage(iconSrc || '', label, label, context.dom)
    icon.setAttribute('slot', 'left-icon')

    return {
      label,
      icon,
      action: () => openPane(subject, pane.name)
    }
  }))

  return menuItems.filter((item): item is NonNullable<typeof item> => item !== undefined)
}
