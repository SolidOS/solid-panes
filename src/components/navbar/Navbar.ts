import { customElement, WebComponent } from 'solid-ui'
import { html, TemplateResult } from 'lit'
import { property } from 'lit/decorators.js'

import 'solid-ui/components/account'
import 'solid-ui/components/button'
import 'solid-ui/components/menu-item'
import 'solid-ui/components/menu'
import 'solid-ui/components/solid-emblem'
import '~icons/lucide/help-circle'

import styles from './Navbar.styles.css'

export interface NavbarMenuItem {
  label: string | TemplateResult
  href?: string
  selected?: boolean
  onSelected?(): void
}

@customElement('solid-panes-navbar')
export default class Navbar extends WebComponent {
  static styles = styles

  @property({ type: Array })
  accessor navbarItems: NavbarMenuItem[] = []

  render () {
    return html`
    <nav class="navbar">
       ${this.navbarItems.map(menuItem => html`
        <button 
          type='button' 
          @click=${() => menuItem.onSelected?.()}
          title="${menuItem.label}" 
          text="${menuItem.label}" 
          aria-expanded="false">
            ${menuItem.label}
        </button>
      `)}
    </nav>
    `
  }
}
