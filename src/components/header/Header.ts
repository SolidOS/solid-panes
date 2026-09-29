import { customElement, WebComponent } from 'solid-ui'
import { html } from 'lit'
import { property } from 'lit/decorators.js'
import type { AccountMenuItem } from 'solid-ui/components/account'

import 'solid-ui/components/account'
import 'solid-ui/components/button'
import 'solid-ui/components/menu-item'
import 'solid-ui/components/menu'
import 'solid-ui/components/solid-emblem'
import '~icons/lucide/help-circle'

import styles from './Header.styles.css'

@customElement('solid-panes-header')
export default class Header extends WebComponent {
  static styles = styles

  @property({ type: Array })
  accessor menuItems: AccountMenuItem[] = []

  render () {
    return html`
        <a href="/" class="logo">
          <span class="sr-only">Home</span>
          <solid-ui-solid-emblem></solid-ui-solid-emblem>
        </a>
        <div class="spacer"></div>
        <solid-ui-account .menuItems=${this.menuItems}></solid-ui-account>
        <span class="separator"></span>
        <solid-ui-menu placement="bottom-end" distance="5">
            <solid-ui-button slot="trigger" variant="ghost" title="Open help">
                <span class="sr-only">Open help</span>
                <icon-lucide-help-circle slot="icon"></icon-lucide-help-circle>
            </solid-ui-button>

            <solid-ui-menu-item href="https://solidos.github.io/userguide/">User guide</solid-ui-menu-item>
            <solid-ui-menu-item href="https://github.com/solidos/solidos/issues">Report a problem</solid-ui-menu-item>
        </solid-ui-menu>
    `
  }
}
