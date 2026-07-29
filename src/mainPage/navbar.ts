import { store } from 'solid-logic'
import { NamedNode } from 'rdflib'
import { getSocialPaneFromURI } from '../utils/socialPaneUtils'
import { html, render } from 'lit-html'
import type { OutlineManager } from '../outline/manager'
import { getPodStorages } from '../utils/podUtils'
import { loadProfileFromURI } from '../utils/webIdUtils'
import { createFolderPaneItem } from '../utils/folderPaneUtils'

import '~icons/lucide/user'
import '~icons/lucide/users'
import '~icons/lucide/folder-open'
import '../components/navbar'

import type { NavbarMenuItem } from '../components/navbar/Navbar'
import { getProfilePaneFromURI } from '../utils/profilePaneUtils'

function createNavItem (label: string, onSelected: () => void): NavbarMenuItem {
  return { label, onSelected }
}

async function createNavbarMenuItems (
  outliner: OutlineManager,
  subject: NamedNode,
  OutlineView: HTMLElement | null
): Promise<NavbarMenuItem[]> {
  const webId = await loadProfileFromURI(subject, store, store.fetcher)
  const podStorages = await getPodStorages(subject.uri)

  const menuItems: NavbarMenuItem[] = []

  if (webId) {
    menuItems.push(
      createNavItem('Profile', async () => {
        const profilePane = await getProfilePaneFromURI(webId)
        if (!profilePane) {
          console.warn('Profile pane is not registered')
          return
        }
        outliner.GotoSubject(subject, true, profilePane, true, undefined, OutlineView)
      }),
      createNavItem('Friends', async () => {
        const socialPane = await getSocialPaneFromURI(webId)
        if (!socialPane) {
          console.warn('Social pane is not registered')
          return
        }
        outliner.GotoSubject(subject, true, socialPane, true, undefined, OutlineView)
      })
    )
  }

  if (podStorages.length > 0) {
    menuItems.push(
      createNavItem('Storage', () => {
        const folderPane = outliner?.context?.session?.paneRegistry?.byName('folder')
        if (!folderPane) {
          console.warn('Folder pane is not registered')
          return
        }
        const folderPanes = podStorages.map((pod, index) =>
          createFolderPaneItem(folderPane, pod, index)
        )
        // TODO make storage work for more storage spaces, not just the first one
        outliner.GotoSubject(subject, true, folderPanes[0], true, undefined, OutlineView)
      })
    )
  }

  return menuItems
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
