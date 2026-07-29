import { store } from 'solid-logic'
import { NamedNode } from 'rdflib'
import { getSocialPaneFromURI, getProfilePaneFromURI, getFolderPaneFromURI } from '../utils/paneUtils'
import { html, render } from 'lit-html'
import type { OutlineManager } from '../outline/manager'
import { getPodStorages } from '../utils/podUtils'
import { loadProfileFromURI } from '../utils/webIdUtils'

import '~icons/lucide/user'
import '~icons/lucide/users'
import '~icons/lucide/folder-open'
import '../components/navbar'

import type { NavbarMenuItem } from '../components/navbar/Navbar'

function createNavItem (label: string, onSelected: () => void): NavbarMenuItem {
  return { label, onSelected }
}

async function createNavbarMenuItems (
  outliner: OutlineManager,
  subject: NamedNode,
  outlineView: HTMLElement | null
): Promise<NavbarMenuItem[]> {
  const webId = await loadProfileFromURI(subject)
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
        outliner.GotoSubject(subject, true, profilePane, true, undefined, outlineView)
      }),
      createNavItem('Friends', async () => {
        const socialPane = await getSocialPaneFromURI(webId)
        if (!socialPane) {
          console.warn('Social pane is not registered')
          return
        }
        outliner.GotoSubject(subject, true, socialPane, true, undefined, outlineView)
      })
    )
  }

  if (podStorages.length > 0) {
    menuItems.push(
      createNavItem('Storage', async () => {
        // TODO make storage work for more storage spaces, not just the first one
        const folderPane = await getFolderPaneFromURI(podStorages[0])
        outliner.GotoSubject(subject, true, folderPane, true, undefined, outlineView)
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
  const menuItems = await createNavbarMenuItems(outliner, subject, OutlineView).catch((err) => {
    console.error('Failed to build navbar menu items:', err)
    return []
  })

  render(
    html`<solid-panes-navbar .navbarItems=${menuItems}></solid-panes-navbar>`,
    tmpContainer
  )

  const navbar = tmpContainer.firstElementChild as HTMLElement | null

  if (!navbar) {
    throw new Error('Failed to create nav bar')
  }

  console.log('Navbar created', navbar)
  if (mainContent) {
    mainContent.insertBefore(navbar, mainContent.firstChild)
  } else {
    document.body.prepend(navbar)
  }

  return navbar
}
