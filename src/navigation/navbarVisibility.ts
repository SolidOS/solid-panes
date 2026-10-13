const NAVBAR_HIDDEN_CLASS = 'navbar--hidden'

/** Show or hide the navbar, if the page has one. */
export function setNavbarHidden (hidden: boolean): void {
  document.querySelector<HTMLElement>('solid-panes-navbar')?.classList.toggle(NAVBAR_HIDDEN_CLASS, hidden)
}
