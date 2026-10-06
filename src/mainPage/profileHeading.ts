import { authn, authSession, store } from 'solid-logic'
import { NamedNode } from 'rdflib'
import { createHeadingEditDialog, getViewerMode, presentProfile } from 'profile-pane'
import type { ProfileDetails } from 'profile-pane'
import { loadProfileFromURI } from '../utils/webIdUtils'
import '../components/profile-heading'
import type { NavbarMenuItem } from '../components/navbar/Navbar'

const PROFILE_HEADING_TAG = 'solid-panes-profile-heading'
const PROFILE_HEADING_MOUNT_ID = 'profile-heading-mount'
const PROFILE_PANE_NAMES = new Set(['profile', 'social'])

let observer: MutationObserver | undefined
let refreshRequest = 0
let popstateListenerRegistered = false
let authListenersRegistered = false
let authReady: Promise<void> | undefined
let displayedPaneKey = ''
let loadingPaneKey = ''
const editListeners = new WeakSet<HTMLElement>()

function installEditListener (heading: HTMLElement & { canEdit?: boolean }) {
  if (editListeners.has(heading)) return

  heading.addEventListener('solid-panes-profile-heading-edit', (event) => {
    if (window.history.state?.paneName !== 'profile') return

    const subjectUri = window.history.state?.paneUri || window.location.href
    loadProfileFromURI(store.sym(subjectUri))
      .then(async (subject) => {
        const viewerMode = await getViewerMode(subject)
        await createHeadingEditDialog(
          event,
          store,
          subject,
          presentProfile(subject, store),
          viewerMode,
          () => refreshProfileHeading(true)
        )
      })
      .catch((error: unknown) => {
        console.error('Failed to edit profile heading.', error)
      })
  })

  editListeners.add(heading)
}

function refreshAfterAuthChange (): void {
  refreshProfileHeading(true).catch((error: unknown) => {
    console.error('Failed to refresh profile heading after an authentication change.', error)
  })
}

function ensureMountPoint (): HTMLElement | null {
  const mainContent = document.getElementById('MainContent')
  if (!mainContent) return null

  let mount = document.getElementById(PROFILE_HEADING_MOUNT_ID)
  if (!mount) {
    mount = document.createElement('div')
    mount.id = PROFILE_HEADING_MOUNT_ID
    mount.setAttribute('aria-label', 'Profile heading')
    mount.style.marginBottom = '20px'
    mount.style.marginTop = '18px'
  }

  const navbar = document.querySelector('solid-panes-navbar')
  const outlineView = document.getElementById('OutlineView')
  const insertionPoint = navbar?.parentNode === mainContent
    ? navbar
    : outlineView?.parentNode === mainContent
      ? outlineView
      : null
  if (insertionPoint && mount.nextSibling !== insertionPoint) {
    mainContent.insertBefore(mount, insertionPoint)
  } else if (!insertionPoint && mount.parentNode !== mainContent) {
    mainContent.appendChild(mount)
  }
  return mount
}

export async function refreshProfileHeading (force = false): Promise<void> {
  await authReady

  const paneName = window.history.state?.paneName
  const mount = ensureMountPoint()
  if (!mount) return

  if (force) {
    refreshRequest++
    displayedPaneKey = ''
    loadingPaneKey = ''
  }

  if (!paneName || !PROFILE_PANE_NAMES.has(paneName)) {
    const navbar = document.querySelector('solid-panes-navbar') as (HTMLElement & {
      navbarItems?: NavbarMenuItem[]
    }) | null
    const selectedNavbarItem = navbar?.navbarItems?.find(item => item.paneName === paneName)
    const viewer = authn.currentUser()
    const viewedProfileUri = selectedNavbarItem?.profileSubjectUri
    if (!viewedProfileUri || viewedProfileUri === viewer?.value) {
      refreshRequest++
      loadingPaneKey = ''
      displayedPaneKey = ''
      mount.hidden = true
      mount.replaceChildren()
      return
    }
  }

  const navbar = document.querySelector('solid-panes-navbar') as (HTMLElement & {
    navbarItems?: NavbarMenuItem[]
  }) | null
  const selectedNavbarItem = navbar?.navbarItems?.find(item => item.paneName === paneName)
  const subjectUri = PROFILE_PANE_NAMES.has(paneName)
    ? window.history.state?.paneUri || selectedNavbarItem?.profileSubjectUri || window.location.href
    : selectedNavbarItem?.profileSubjectUri
  if (!subjectUri) return
  const paneKey = `${paneName}:${subjectUri}`
  if (paneKey === displayedPaneKey || paneKey === loadingPaneKey) return

  const request = ++refreshRequest
  loadingPaneKey = paneKey
  let subject: NamedNode
  let profileData: ProfileDetails
  let canEdit: boolean
  try {
    subject = await loadProfileFromURI(store.sym(subjectUri))
    profileData = presentProfile(subject, store)
    canEdit = paneName === 'profile' && await getViewerMode(subject) === 'owner'
  } catch (error) {
    if (request === refreshRequest) loadingPaneKey = ''
    throw error
  }
  if (request !== refreshRequest) return

  const heading = (mount.querySelector(PROFILE_HEADING_TAG) ||
    document.createElement(PROFILE_HEADING_TAG)) as HTMLElement & {
      profileData?: ProfileDetails
      canEdit?: boolean
    }
  installEditListener(heading)
  heading.profileData = profileData
  heading.canEdit = canEdit
  mount.hidden = false
  if (heading.parentNode !== mount) mount.replaceChildren(heading)
  displayedPaneKey = paneKey
  loadingPaneKey = ''
}

export function initializeProfileHeading (): void {
  ensureMountPoint()

  const readiness = authReady ?? authn.checkUser().then(() => undefined)
  authReady = readiness

  if (!authListenersRegistered) {
    authSession.events.on('login', refreshAfterAuthChange)
    authSession.events.on('sessionRestore', refreshAfterAuthChange)
    authSession.events.on('logout', refreshAfterAuthChange)
    authSession.events.on('sessionChange', refreshAfterAuthChange)
    authSession.events.on('identityReplaced', refreshAfterAuthChange)
    authListenersRegistered = true
  }

  if (!observer && typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver(() => {
      refreshProfileHeading().catch((error: unknown) => {
        console.error('Failed to refresh profile heading.', error)
      })
    })
    observer.observe(document.getElementById('MainContent') || document.body, {
      childList: true,
      subtree: true
    })
  }

  if (!popstateListenerRegistered) {
    window.addEventListener('popstate', () => {
      refreshProfileHeading().catch((error: unknown) => {
        console.error('Failed to refresh profile heading.', error)
      })
    })
    popstateListenerRegistered = true
  }

  readiness.then(() => refreshProfileHeading(true)).catch((error: unknown) => {
    console.error('Failed to refresh profile heading.', error)
  })
}
