import { sym } from 'rdflib'
import { isOwnWebIdProfile } from '../utils/webIdUtils'
import { isNavbarHidden } from './chrome'
import { isPageInViewerPod } from './podContext'

const NAVBAR_HIDDEN_CLASS = 'navbar--hidden'
let revision = 0

/** Show or hide the navbar, if the page has one. */
export function setNavbarHidden (hidden: boolean): void {
  ++revision
  document.querySelector<HTMLElement>('solid-panes-navbar')?.classList.toggle(NAVBAR_HIDDEN_CLASS, hidden)
}

/** Apply ownership rules without letting an older lookup overwrite a newer navigation. */
export async function refreshNavbarVisibility (url: string, viaAccountMenu = false): Promise<void> {
  const request = ++revision
  const ownProfile = isOwnWebIdProfile(sym(url))
  if (viaAccountMenu || ownProfile) {
    setNavbarHidden(true)
    return
  }

  const inViewerPod = await isPageInViewerPod(url)
  if (request !== revision) return
  setNavbarHidden(isNavbarHidden({ viaAccountMenu, ownProfile, inViewerPod }))
}
