import { store } from 'solid-logic'
import { NamedNode } from 'rdflib'
import { getSocialPaneFromURI, getProfilePaneFromURI, getFolderPanesFromURI } from '../utils/paneUtils'
import { html, render } from 'lit-html'
import type { OutlineManager } from '../outline/manager'
import { isWebIdUri, loadProfileFromURI } from '../utils/webIdUtils'

import '~icons/lucide/user'
import '~icons/lucide/users'
import '~icons/lucide/folder-open'
import '../components/navbar'

import type { NavbarMenuItem } from '../components/navbar/Navbar'

function createNavItem (
  label: string,
  onSelected: () => void,
  selected = false
): NavbarMenuItem {
  return { label, onSelected, selected }
}

async function createNavbarMenuItems (
  outliner: OutlineManager,
  subject: NamedNode,
  outlineView: HTMLElement | null,
  selectedPaneName?: string
): Promise<NavbarMenuItem[]> {
  const webId = await loadProfileFromURI(subject)
  const selectedPane = selectedPaneName || (isWebIdUri(subject) ? 'profile' : undefined)

  const menuItems: NavbarMenuItem[] = []

  if (webId) {
    menuItems.push(
      createNavItem('Profile', async () => {
        const profilePane = await getProfilePaneFromURI(webId)
        outliner.GotoSubject(subject, true, profilePane, true, undefined, outlineView)
      }, selectedPane === 'profile'),
      createNavItem('Friends', async () => {
        const socialPane = await getSocialPaneFromURI(webId)
        outliner.GotoSubject(subject, true, socialPane, true, undefined, outlineView)
      }, selectedPane === 'social')
    )
  }

  const storagePanes = await getFolderPanesFromURI(subject)
  storagePanes.forEach(pane => {
    menuItems.push(
      createNavItem(
        pane.label(),
        async () => {
          outliner.GotoSubject(subject, true, pane, true, undefined, outlineView)
        },
        selectedPane === pane.paneName
      )
    )
  })

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
  const selectedPaneName = window.history.state?.paneName
  const menuItems = await createNavbarMenuItems(outliner, subject, OutlineView, selectedPaneName).catch((err) => {
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

  if (mainContent) {
    mainContent.insertBefore(navbar, mainContent.firstChild)
  } else {
    document.body.prepend(navbar)
  }

  return navbar
}
