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
  selected?: boolean
  onSelected?(): void
}

@customElement('solid-panes-navbar')
export default class Navbar extends WebComponent {
  static styles = styles

  @property({ type: Array })
  accessor navbarItems: NavbarMenuItem[] = []

  private selectItem (item: NavbarMenuItem) {
    this.navbarItems = this.navbarItems.map(menuItem => ({
      ...menuItem,
      selected: menuItem === item
    }))
    item.onSelected?.()
  }

  render () {
    return html`
    <nav class="navbar">
       ${this.navbarItems.map(menuItem => html`
        <button
          type="button"
          class=${menuItem.selected ? 'selected' : ''}
          @click=${() => this.selectItem(menuItem)}
          title=${typeof menuItem.label === 'string' ? menuItem.label : ''}
        >
          ${menuItem.label}
        </button>
      `)}
    </nav>
    `
  }
}
