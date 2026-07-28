import { store } from 'solid-logic'
import { html, render } from 'lit-html'
import type { OutlineManager } from '../outline/manager'
import { getPodStorages } from '../outline/podUtils'
import { createFolderPaneItem } from '../outline/folderPaneUtils'

import '~icons/lucide/user'
import '~icons/lucide/users'
import '~icons/lucide/folder-open'
import '../components/navbar'
import { NamedNode } from 'rdflib'
import { NavbarMenuItem } from 'src/components/navbar/Navbar'

function createNavItem (label: string, onSelected: () => void): NavbarMenuItem {
  return { label, onSelected }
}

async function createNavbarMenuItems (
  outliner: OutlineManager,
  subject: NamedNode,
  OutlineView: HTMLElement | null
): Promise<NavbarMenuItem[]> {
  const baseItems: NavbarMenuItem[] = [
    createNavItem('Profile', () => {
      const profilePane = outliner?.context?.session?.paneRegistry?.byName('profile')
      outliner.GotoSubject(subject, true, profilePane, true, undefined, OutlineView)
    }),
    createNavItem('Friends', () => {
      const socialPane = outliner?.context?.session?.paneRegistry?.byName('social')
      outliner.GotoSubject(subject, true, socialPane, true, undefined, OutlineView)
    })
  ]

  const podStorages = await getPodStorages(subject.uri)
  if (podStorages.length === 0) return baseItems

  return [
    ...baseItems,
    createNavItem('Storage', () => {
      const folderPanes = podStorages.map((pod, index) => createFolderPaneItem(outliner?.context?.session?.paneRegistry?.byName('folder'), pod, index))
      if (folderPanes.length === 0) {
        console.warn('Folder pane is not registered')
        return
      }
      // TODO make storage work for more storage spaces, not just the first one
      outliner.GotoSubject(subject, true, folderPanes[0], true, undefined, OutlineView)
    })
  ]
}

export async function createNavbar (outliner: OutlineManager) {
  const existingNavbar = document.querySelector('solid-panes-navbar')

  if (existingNavbar) {
    return existingNavbar
  }

  const OutlineView = document.getElementById('OutlineView')
  const mainContent = document.getElementById('MainContent')
  const tmpContainer = document.createElement('div')
  const uri = window.location.href
  const subject: NamedNode = typeof uri === 'string' ? store.sym(uri) : uri
  const menuItems = await createNavbarMenuItems(outliner, subject, OutlineView)

  render(
    html`<solid-panes-navbar .navbarItems=${menuItems}></solid-panes-navbar>`,
    tmpContainer
  )

  const navbar = tmpContainer.firstElementChild as HTMLElement | null

  if (!navbar) {
    throw new Error('Failed to create nav bar')
  }

  if (mainContent) {
    mainContent.insertBefore(navbar, mainContent.firstChild)
  } else {
    document.body.prepend(navbar)
  }

  return navbar
}
