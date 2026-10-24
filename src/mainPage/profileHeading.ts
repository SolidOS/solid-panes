import { authn, authSession, store } from 'solid-logic'
import { NamedNode } from 'rdflib'
import type { ProfileDetails } from '../components/profile-heading/editor/sections/heading/types'
import type { ProfileHeadingEditContext } from '../components/profile-heading/ProfileHeading'
import { getViewerMode, presentProfile } from '../components/profile-heading/profileHeadingData'
import type { ViewerMode } from '../types'
import { loadProfileFromURI } from '../utils/webIdUtils'
import '../components/profile-heading'
import './profileHeading.css'
import { deriveHeading, offersFriendAction } from '../navigation/chrome'
import { getPodContext } from '../navigation/podContext'
import { onNavigated } from '../navigation/events'
import { readNavigationState } from '../navigation/state'

const PROFILE_HEADING_TAG = 'solid-panes-profile-heading'
const PROFILE_HEADING_MOUNT_ID = 'profile-heading-mount'

let refreshRequest = 0
let navigatedListenerRegistered = false
let authListenersRegistered = false
let profileSavedListenerRegistered = false
let authReady: Promise<void> | undefined
let displayedPaneKey = ''
let displayedSubjectUri = ''
let loadingPaneKey = ''
const hideAnimations = new WeakMap<HTMLElement, Animation>()
const showAnimations = new WeakMap<HTMLElement, Animation>()

function showHeading (mount: HTMLElement): void {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      typeof mount.animate !== 'function') return

  const style = getComputedStyle(mount)
  const marginTop = style.marginTop || '18px'
  const marginBottom = style.marginBottom || '20px'
  const animation = mount.animate([
    { height: '0px', opacity: 0, marginTop: '0px', marginBottom: '0px', overflow: 'hidden' },
    {
      height: `${mount.getBoundingClientRect().height}px`,
      opacity: 1,
      marginTop,
      marginBottom,
      overflow: 'hidden'
    }
  ], { duration: 300, easing: 'ease', fill: 'both' })
  showAnimations.set(mount, animation)
  const finish = () => {
    if (showAnimations.get(mount) !== animation) return
    showAnimations.delete(mount)
    animation.cancel()
  }
  animation.finished.then(finish, (error: unknown) => {
    if (showAnimations.get(mount) !== animation) return
    console.error('Failed to animate profile heading appearance.', error)
    finish()
  })
}

function cancelHeadingHide (mount: HTMLElement): void {
  const animation = hideAnimations.get(mount)
  hideAnimations.delete(mount)
  animation?.cancel()
  mount.inert = false
  mount.removeAttribute('aria-hidden')
}

function hideHeading (mount: HTMLElement): void {
  if (hideAnimations.has(mount)) return

  const style = getComputedStyle(mount)
  const height = mount.getBoundingClientRect().height
  const opacity = style.opacity
  const marginTop = style.marginTop
  const marginBottom = style.marginBottom
  const showing = showAnimations.get(mount)
  showAnimations.delete(mount)
  showing?.cancel()

  const finish = () => {
    mount.hidden = true
    mount.replaceChildren()
  }
  mount.inert = true
  mount.setAttribute('aria-hidden', 'true')

  if (mount.hidden || !mount.firstElementChild ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      typeof mount.animate !== 'function') {
    finish()
    return
  }

  const animation = mount.animate([
    {
      height: `${height}px`,
      opacity,
      marginTop,
      marginBottom,
      overflow: 'hidden'
    },
    { height: '0px', opacity: 0, marginTop: '0px', marginBottom: '0px', overflow: 'hidden' }
  ], { duration: 300, easing: 'ease', fill: 'forwards' })
  hideAnimations.set(mount, animation)
  animation.finished.then(() => {
    if (hideAnimations.get(mount) !== animation) return
    finish()
    hideAnimations.delete(mount)
    animation.cancel()
  }, (error: unknown) => {
    if (hideAnimations.get(mount) !== animation) return
    console.error('Failed to animate profile heading disappearance.', error)
    finish()
    hideAnimations.delete(mount)
    animation.cancel()
  })
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

  const pod = await getPodContext(window.location.href)
  const mount = ensureMountPoint()
  if (!mount) return

  if (force) {
    refreshRequest++
    displayedPaneKey = ''
    loadingPaneKey = ''
  }

  const { view, viaAccountMenu } = readNavigationState()
  const decision = deriveHeading({
    view,
    viaAccountMenu,
    viewer: authn.currentUser()?.value,
    pageUrl: window.location.href,
    owner: pod.owner,
    storageUris: pod.storagePanes.map(pane => pane.subject.value)
  })

  if (decision.mode === 'none') {
    refreshRequest++
    loadingPaneKey = ''
    displayedPaneKey = ''
    displayedSubjectUri = ''
    hideHeading(mount)
    return
  }

  const { subjectUri } = decision
  const isProfilePane = decision.mode === 'full'
  cancelHeadingHide(mount)
  const paneKey = `${decision.paneName}:${subjectUri}`
  if (paneKey === displayedPaneKey || paneKey === loadingPaneKey) return

  const request = ++refreshRequest
  loadingPaneKey = paneKey
  let subject: NamedNode
  let profileData: ProfileDetails
  let canEdit: boolean
  let viewerMode: ViewerMode
  try {
    subject = await loadProfileFromURI(store.sym(subjectUri))
    profileData = presentProfile(subject, store)
    viewerMode = isProfilePane ? await getViewerMode(subject) : 'anonymous'
    canEdit = viewerMode === 'owner'
  } catch (error) {
    if (request === refreshRequest) loadingPaneKey = ''
    throw error
  }
  if (request !== refreshRequest) return

  const heading = (mount.querySelector(PROFILE_HEADING_TAG) ||
    document.createElement(PROFILE_HEADING_TAG)) as HTMLElement & {
      profileData?: ProfileDetails
      editContext?: ProfileHeadingEditContext
      friendSubject?: NamedNode
      compact?: boolean
      updateComplete?: Promise<unknown>
    }
  heading.profileData = profileData
  const viewer = authn.currentUser()
  heading.friendSubject = offersFriendAction(decision.paneName) && viewer && !viewer.sameTerm(subject)
    ? subject
    : undefined
  heading.editContext = canEdit
    ? {
        subject,
        profileData,
        viewerMode,
        onSaved: () => refreshProfileHeading(true)
      }
    : undefined
  heading.compact = !isProfilePane
  const appearing = mount.hidden || !mount.firstElementChild
  mount.hidden = false
  if (heading.parentNode !== mount) mount.replaceChildren(heading)
  displayedPaneKey = paneKey
  displayedSubjectUri = subject.value
  loadingPaneKey = ''
  if (appearing) {
    await heading.updateComplete
    if (request === refreshRequest && mount.isConnected && !mount.hidden && !hideAnimations.has(mount)) {
      showHeading(mount)
    }
  }
}

/** Put the heading where it belongs, above the navbar, after the navbar has been added. */
export function placeProfileHeading (): void {
  ensureMountPoint()
}

export function initializeProfileHeading (): Promise<void> {
  ensureMountPoint()

  if (!profileSavedListenerRegistered) {
    document.addEventListener('profile-pane-saved', (event) => {
      if (!(event instanceof CustomEvent) || event.detail?.subjectUri !== displayedSubjectUri) return

      const heading = document.querySelector<HTMLElement & {
        profileData?: ProfileDetails
        editContext?: ProfileHeadingEditContext
      }>(`#${PROFILE_HEADING_MOUNT_ID} ${PROFILE_HEADING_TAG}`)
      if (heading && event.detail.profileData) {
        refreshRequest++
        loadingPaneKey = ''
        heading.profileData = event.detail.profileData
        if (heading.editContext) {
          heading.editContext = { ...heading.editContext, profileData: event.detail.profileData }
        }
        return
      }

      refreshProfileHeading(true).catch((error: unknown) => {
        console.error('Failed to refresh profile heading after saving profile information.', error)
      })
    })
    profileSavedListenerRegistered = true
  }

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

  // Navigations the page's own navigation does not make, such as links and buttons in solid-ui
  if (!navigatedListenerRegistered) {
    onNavigated(() => {
      refreshProfileHeading().catch((error: unknown) => {
        console.error('Failed to refresh profile heading.', error)
      })
    })
    navigatedListenerRegistered = true
  }

  readiness.then(() => refreshProfileHeading(true)).catch((error: unknown) => {
    console.error('Failed to refresh profile heading.', error)
  })
  return readiness
}
