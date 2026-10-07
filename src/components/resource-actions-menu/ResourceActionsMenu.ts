import { WebComponent } from 'solid-ui'
import { customElement, property } from 'lit/decorators.js'
import { html, nothing } from 'lit'
import 'solid-ui/components/button'
import 'solid-ui/components/menu'
import 'solid-ui/components/menu-item'
import '~icons/lucide/ellipsis-vertical'
import '~icons/lucide/user-round-cog'
import '~icons/lucide/pencil'
import { LiveStore } from 'rdflib'
import styles from './ResourceActionsMenu.styles.css'
import { isContainerSubject } from '../../utils/podUtils'
@customElement('resource-actions-menu')
export default class ResourceActionsMenu extends WebComponent {
  static styles = styles

  @property({ attribute: false })
  accessor store: LiveStore | undefined

  @property({ type: String })
  accessor subjectUri: string | undefined

  @property({ attribute: false })
  accessor handleAccessClick: (() => void) | undefined = undefined

  @property({ attribute: false })
  accessor handleEditingClick: (() => void) | undefined = undefined

  @property({ type: Boolean })
  accessor paneSupportsEditing = false

  @property({ type: Boolean })
  accessor canEdit = false

  @property({ type: Boolean })
  accessor isMobile = false

  @property({ attribute: false })
  accessor menuItems: Array<{ label: string, icon?: unknown, action: (event: Event) => void }> = []

  render () {
    const isContainerResource = isContainerSubject(this.store, this.subjectUri)
    const canEdit = !isContainerResource && this.isMobile && this.paneSupportsEditing && this.canEdit && !!this.handleEditingClick
    const canManageAccess = !!this.handleAccessClick
    return html`
      <solid-ui-menu>
        <solid-ui-button slot="trigger" class="file-explorer-header-more-button" variant="ghost" title="More options">
          <icon-lucide-ellipsis-vertical slot="icon" class="ellipsisIcon"></icon-lucide-ellipsis-vertical>
        </solid-ui-button>
        ${this.menuItems.map(item => html`
          <solid-ui-menu-item @solid-ui-select=${(event: Event) => item.action(event)}>
            ${item.icon}
            ${item.label}
          </solid-ui-menu-item>
        `)}
        ${canEdit
          ? html`
              <solid-ui-menu-item @solid-ui-select=${this.handleEditingClick}>
                <icon-lucide-pencil slot="left-icon"></icon-lucide-pencil>
                Edit
              </solid-ui-menu-item>
            `
          : nothing}
        ${!isContainerResource && this.isMobile && canManageAccess
          ? html`
              <solid-ui-menu-item @solid-ui-select=${this.handleAccessClick}>
                <icon-lucide-user-round-cog slot="left-icon"></icon-lucide-user-round-cog>
                Manage Access
              </solid-ui-menu-item>
            `
          : nothing}
        ${isContainerResource && canManageAccess
          ? html`
              <solid-ui-menu-item @solid-ui-select=${this.handleAccessClick}>
                <icon-lucide-user-round-cog slot="left-icon"></icon-lucide-user-round-cog>
                Manage Access
              </solid-ui-menu-item>
            `
          : nothing}
      </solid-ui-menu>
    `
  }
}
