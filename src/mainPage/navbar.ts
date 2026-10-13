import { store } from 'solid-logic'
import { html, render } from 'lit-html'
import type { NavigationController } from '../navigation/controller'
import { isOwnWebIdProfile, isWebIdUri } from '../utils/webIdUtils'
import { deriveNavbarSelection, isNavbarHidden, isNavbarItemSelected, pickNavbarItem } from '../navigation/chrome'
import { onNavigated } from '../navigation/events'
import { readNavigationState, type NavigationView } from '../navigation/state'
import { getPodContext, isSamePod, type PodContext } from '../navigation/podContext'
import { setNavbarHidden } from '../navigation/navbarVisibility'

import '~icons/lucide/user'
import '~icons/lucide/users'
import '~icons/lucide/folder-open'
import '../components/navbar'

import type { NavbarMenuItem } from '../components/navbar/Navbar'

function showNavbar () {
  setNavbarHidden(isNavbarHidden({
    viaAccountMenu: false,
    ownProfile: isOwnWebIdProfile(store.sym(window.location.href))
  }))
}

let selectPaneInNavbar: ((paneName: string, paneUri?: string) => void) | undefined

export function selectNavbarPane (paneName: string, paneUri?: string): void {
  selectPaneInNavbar?.(paneName, paneUri)
}

function createNavItem (
  label: string,
  paneName: string,
  paneUri: string,
  onSelected: () => void,
  selected = false
): NavbarMenuItem {
  return {
    label,
    paneName,
    paneUri,
    onSelected () {
      showNavbar()
      return onSelected()
    },
    selected
  }
}

// The items offered for the pod the page is in. Choosing one displays that pane while the
// page URL stays as it is.
function createNavbarMenuItems (
  context: PodContext,
  navigation: NavigationController,
  view: NavigationView
): NavbarMenuItem[] {
  const selection = deriveNavbarSelection(view, isWebIdUri(store.sym(window.location.href)))

  const menuItems: NavbarMenuItem[] = []

  if (context.owner) {
    const owner = context.owner
    menuItems.push(
      createNavItem('Profile', 'profile', owner, () => navigation.show({ kind: 'profile', subject: owner }),
        isNavbarItemSelected({ paneName: 'profile' }, selection, 0)),
      createNavItem('Friends', 'social', owner, () => navigation.show({ kind: 'friends', subject: owner }),
        isNavbarItemSelected({ paneName: 'social' }, selection, 0))
    )
  }

  context.storagePanes.forEach(pane => {
    menuItems.push(
      createNavItem(
        pane.label(),
        pane.paneName,
        pane.subject.value,
        () => navigation.show({ kind: 'storage', pane }),
        isNavbarItemSelected(
          { paneName: pane.paneName, paneUri: pane.subject.value },
          selection,
          context.storagePanes.length
        )
      )
    )
  })

  return menuItems
}

export async function createNavbar (navigation: NavigationController) {
  const existingNavbar = document.querySelector<HTMLElement>('solid-panes-navbar')

  if (existingNavbar) {
    showNavbar()
    return existingNavbar
  }

  const mainContent = document.getElementById('MainContent')
  const tmpContainer = document.createElement('div')
  let podContext = await getPodContext(window.location.href)
  let menuItems = createNavbarMenuItems(podContext, navigation, readNavigationState().view)

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
    const item = pickNavbarItem(menuItems, paneName, paneUri)
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

  // The items belong to one pod. When a navigation (a link, back or forward) lands in another
  // pod, they would offer the wrong profile and storages, so build them again.
  let rebuildRequest = 0
  const stopListening = onNavigated(({ url, state }) => {
    if (!navbar.isConnected) return stopListening()

    const request = ++rebuildRequest
    getPodContext(url).then(next => {
      if (request !== rebuildRequest || isSamePod(podContext, next)) return
      podContext = next
      menuItems = createNavbarMenuItems(next, navigation, state.view)
      renderNavbar()
    }).catch(error => console.error('Failed to rebuild the navbar for the new pod:', error))
  })

  return navbar
}
