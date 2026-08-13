import { WebComponent } from 'solid-ui'
import { customElement, property } from 'lit/decorators.js'
import { html, nothing } from 'lit'
import 'solid-ui/components/button'
import 'solid-ui/components/menu'
import 'solid-ui/components/menu-item'
import '~icons/lucide/ellipsis-vertical'
import '~icons/lucide/share-2'
import { LiveStore } from 'rdflib'
import styles from './ResourceActionsMenu.styles.css'
import { isContainerSubject } from '../file-explorer-header/helper'
@customElement('resource-actions-menu')
export default class ResourceActionsMenu extends WebComponent {
  static styles = styles

  @property({ attribute: false })
  accessor store: LiveStore | undefined

  @property({ type: String })
  accessor subjectUri: string | undefined

  @property({ attribute: false })
  accessor handleSharingClick: (() => void) | undefined = undefined

  @property({ attribute: false })
  accessor menuItems: Array<{ label: string, icon?: HTMLElement, action: (event: Event) => void }> = []

  render () {
    const isContainerResource = isContainerSubject(this.store, this.subjectUri)

    return html`
      <solid-ui-menu>
        <solid-ui-button slot="trigger" variant="ghost" title="More options">
          <icon-lucide-ellipsis-vertical slot="icon" class="ellipsisIcon"></icon-lucide-ellipsis-vertical>
        </solid-ui-button>
        ${this.menuItems.map(item => html`
          <solid-ui-menu-item @solid-ui-select=${(event: Event) => item.action(event)}>
            ${item.icon}
            ${item.label}
          </solid-ui-menu-item>
        `)}
        ${isContainerResource && this.handleSharingClick
          ? html`
              <solid-ui-menu-item @solid-ui-select=${() => this.handleSharingClick?.()}>
                <icon-lucide-share-2 slot="left-icon"></icon-lucide-share-2>
                Share
              </solid-ui-menu-item>
            `
          : nothing}
      </solid-ui-menu>
    `
  }
}
