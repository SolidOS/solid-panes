import { WebComponent } from 'solid-ui'
import { customElement, property, state } from 'lit/decorators.js'
import { consume } from '@lit/context'
import { html, nothing } from 'lit'
import 'solid-ui/components/button'
import '~icons/lucide/share-2'
import '~icons/lucide/pencil'
import styles from './FileExplorerHeaderControls.styles.css'
import '../resource-actions-menu/ResourceActionsMenu'
import { fileExplorerContext, type FileExplorerContext } from 'solid-ui'
import { isContainerSubject } from './helper'

@customElement('file-explorer-header-controls')
export default class FileExplorerHeaderControls extends WebComponent {
  static styles = styles

  private mobileMediaQuery: MediaQueryList | undefined
  private readonly mobileQuery = '(max-width: 600px)'
  private readonly handleMobileMediaChange = (event: MediaQueryListEvent) => {
    this.isMobile = event.matches
  }

  @consume({ context: fileExplorerContext, subscribe: true })
  accessor fileExplorerContext: FileExplorerContext = undefined as unknown as FileExplorerContext

  @property({ attribute: false })
  accessor menuItems: Array<{ label: string, action: (event: Event) => void, icon?: HTMLElement }> = []

  @property({ type: Boolean })
  accessor canEdit: boolean = false

  @state()
  accessor isMobile = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(max-width: 600px)').matches
    : false

  connectedCallback () {
    super.connectedCallback()

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    this.mobileMediaQuery = window.matchMedia(this.mobileQuery)
    this.isMobile = this.mobileMediaQuery.matches
    this.mobileMediaQuery.addEventListener('change', this.handleMobileMediaChange)
  }

  disconnectedCallback () {
    this.mobileMediaQuery?.removeEventListener('change', this.handleMobileMediaChange)
    this.mobileMediaQuery = undefined
    super.disconnectedCallback()
  }

  // TODO: Add broken then use this function to set tooltip and disable edit button
  /* private setEditable() {
    const sourcePaneState = this.sourceContext?.sourcePaneState
    const { canEdit } = this.sourceContext?.headerMetadata ?? { canEdit: false }
    const subject = this.sourceContext?.subject
    if (!sourcePaneState || !canEdit || sourcePaneState.broken || (subject && subject.endsWith('/'))) return

    this.sourceContext?.setEditing?.()
  } */

  private getEditTooltip () {
    if (!this.fileExplorerContext.paneSupportsEditing) return 'Not Supported'
    if (!this.canEdit) return 'No Access'
    return 'Edit'
  }

  private renderDirtyIndicator () {
    if (!this.fileExplorerContext.edit?.isDirty) return nothing

    return html`<span class="dirtyIndicator" title="This file has unsaved changes">Unsaved</span>`
  }

  render () {
    const isContainerResource = isContainerSubject(this.fileExplorerContext.store, this.fileExplorerContext.subjectUri)

    return html`
      <div>
        ${this.renderDirtyIndicator()}
        ${!isContainerResource && !this.isMobile
          ? html`
              <solid-ui-button class="file-explorer-header-share-button" variant="ghost" title="Share" @click=${this.fileExplorerContext.handleSharingClick}>
                <icon-lucide-share-2 slot="icon"></icon-lucide-share-2>
              </solid-ui-button>
              <solid-ui-button
                class="file-explorer-header-edit-button"
                variant="ghost"
                title=${this.getEditTooltip()}
                ?disabled=${!this.fileExplorerContext.paneSupportsEditing || !this.canEdit}
                @click=${this.fileExplorerContext.edit?.onEdit}
              >
                <icon-lucide-pencil slot="icon"></icon-lucide-pencil>
              </solid-ui-button>
            `
          : nothing}
        <resource-actions-menu
          .store=${this.fileExplorerContext.store}
          .handleSharingClick=${this.fileExplorerContext.handleSharingClick}
          .handleEditingClick=${this.fileExplorerContext.edit?.onEdit}
          .paneSupportsEditing=${this.fileExplorerContext.paneSupportsEditing}
          .canEdit=${this.canEdit}
          .subjectUri=${this.fileExplorerContext?.subjectUri}
          .menuItems=${this.menuItems}
          .isMobile=${this.isMobile}
        ></resource-actions-menu>
      </div>
    `
  }
}
