import 'solid-ui/components/footer'
import type { LiveStore } from 'rdflib'

declare module 'solid-ui/components/footer'
import 'solid-ui/components/footer'

type FooterElement = HTMLElement & {
  store?: LiveStore | null
  position?: 'static' | 'absolute' | 'relative' | 'fixed' | 'sticky'
  top?: string
  right?: string
  bottom?: string
  left?: string
}

export function createFooter (store: LiveStore) {
  let footer = document.querySelector('solid-ui-footer') as FooterElement | null

  if (!footer) {
    footer = document.createElement('solid-ui-footer') as FooterElement
    footer.className = 'menu-footer'
    footer.style.position = 'static'
    footer.style.width = '100%'
    const navMenu = document.getElementById('NavMenu')
    if (navMenu) {
      navMenu.appendChild(footer)
    } else {
      document.body.appendChild(footer)
    }
  } else {
    const navMenu = document.getElementById('NavMenu')
    if (navMenu && footer.parentElement !== navMenu) {
      navMenu.appendChild(footer)
    }
  }

  footer.store = store
  return footer
}
