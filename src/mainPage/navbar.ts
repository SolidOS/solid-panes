import { store } from 'solid-logic'
import { NamedNode } from 'rdflib'
import { getSocialPaneFromURI, getProfilePaneFromURI, getFolderPanesFromURI } from '../utils/paneUtils'
import { html, render } from 'lit-html'
import type { OutlineManager } from '../outline/manager'
import { isOwnWebIdProfile, isWebIdUri, loadProfileFromURI } from '../utils/webIdUtils'

import '~icons/lucide/user'
import '~icons/lucide/users'
import '~icons/lucide/folder-open'
import '../components/navbar'

import type { NavbarMenuItem } from '../components/navbar/Navbar'

function showNavbar () {
  const navbar = document.querySelector<HTMLElement>('solid-panes-navbar')
  if (navbar) {
    navbar.classList.toggle('navbar--hidden', isOwnWebIdProfile(store.sym(window.location.href)))
  }
}

let selectPaneInNavbar: ((paneName: string, paneUri?: string) => void) | undefined

export function selectNavbarPane (paneName: string, paneUri?: string): void {
  selectPaneInNavbar?.(paneName, paneUri)
}

function createNavItem (
  label: string,
  paneName: string,
  profileSubjectUri: string,
  paneUri: string,
  onSelected: () => void,
  selected = false
): NavbarMenuItem {
  return {
    label,
    paneName,
    paneUri,
    profileSubjectUri,
    onSelected () {
      showNavbar()
      return onSelected()
    },
    selected
  }
}

async function createNavbarMenuItems (
  outliner: OutlineManager,
  subject: NamedNode,
  outlineView: HTMLElement | null,
  selectedPaneName?: string,
  selectedPaneUri?: string
): Promise<NavbarMenuItem[]> {
  const webId = await loadProfileFromURI(subject)
  const selectedPane = selectedPaneName || (isWebIdUri(subject) ? 'profile' : undefined)

  const menuItems: NavbarMenuItem[] = []

  if (webId) {
    menuItems.push(
      createNavItem('Profile', 'profile', webId.value, webId.value, async () => {
        const profilePane = await getProfilePaneFromURI(webId)
        outliner.GotoSubject(subject, true, profilePane, true, undefined, outlineView)
      }, selectedPane === 'profile'),
      createNavItem('Friends', 'social', webId.value, webId.value, async () => {
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
        pane.paneName,
        webId?.value ?? '',
        pane.subject.value,
        async () => {
          outliner.GotoSubject(subject, true, pane, true, undefined, outlineView)
        },
        selectedPane === pane.paneName &&
          (selectedPaneUri ? selectedPaneUri === pane.subject.value : storagePanes.length === 1)
      )
    )
  })

  return menuItems
}

export async function createNavbar (outliner: OutlineManager) {
  const existingNavbar = document.querySelector<HTMLElement>('solid-panes-navbar')

  if (existingNavbar) {
    showNavbar()
    return existingNavbar
  }

  const OutlineView = document.getElementById('OutlineView')
  const mainContent = document.getElementById('MainContent')
  const tmpContainer = document.createElement('div')
  const uri = window.location.href
  const subject: NamedNode = typeof uri === 'string' ? store.sym(uri) : uri
  const selectedPaneName = window.history.state?.paneName
  const selectedPaneUri = window.history.state?.paneUri
  let menuItems = await createNavbarMenuItems(outliner, subject, OutlineView, selectedPaneName, selectedPaneUri).catch((err) => {
    console.error('Failed to build navbar menu items:', err)
    return []
  })

  function setSelectedItem (selectedItem: NavbarMenuItem) {
    menuItems = menuItems.map((menuItem) => ({
      ...menuItem,
      selected: menuItem === selectedItem
    }))
  }

  function handleSelectionChanged (event: Event) {
    const { detail: selectedItem } = event as CustomEvent<NavbarMenuItem>
    setSelectedItem(selectedItem)

    Promise.resolve(selectedItem.onSelected?.()).catch((error) => {
      console.error('Navbar menu item selection failed:', error)
    })

    renderNavbar()
  }

  function renderNavbar () {
    render(
      html`<solid-panes-navbar .navbarItems=${menuItems} @solid-ui-select=${handleSelectionChanged}></solid-panes-navbar>`,
      tmpContainer
    )
  }

  renderNavbar()

  selectPaneInNavbar = (paneName, paneUri) => {
    const panes = menuItems.filter(menuItem => menuItem.paneName === paneName)
    const item = panes.find(menuItem => menuItem.paneUri === paneUri) ?? panes[0]
    if (!item) return
    setSelectedItem(item)
    renderNavbar()
  }

  const navbar = tmpContainer.firstElementChild as HTMLElement | null

  if (!navbar) {
    throw new Error('Failed to create nav bar')
  }

  if (mainContent) {
    mainContent.insertBefore(navbar, mainContent.firstChild)
  } else {
    document.body.prepend(navbar)
  }

  showNavbar()

  return navbar
}
