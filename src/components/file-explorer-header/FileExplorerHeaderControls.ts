import { WebComponent } from 'solid-ui'
import { customElement, property } from 'lit/decorators.js'
import { consume } from '@lit/context'
import { html, nothing } from 'lit'
import 'solid-ui/components/button'
import '~icons/lucide/share-2'
import '~icons/lucide/pencil'
import styles from './FileExplorerHeaderControls.styles.css'
import '../resource-actions-menu/ResourceActionsMenu'
import { fileExplorerContext, type FileExplorerContext } from 'solid-ui'

@customElement('file-explorer-header-controls')
export default class FileExplorerHeaderControls extends WebComponent {
  static styles = styles

  @consume({ context: fileExplorerContext, subscribe: true })
  accessor fileExplorerContext: FileExplorerContext = undefined as unknown as FileExplorerContext

  @property({ attribute: false })
  accessor menuItems: Array<{ label: string, action: (event: Event) => void }> = []

  @property({ type: Boolean })
  accessor canEdit: boolean = false

  // TODO: Add broken then use this function to set tooltip and disable edit button
  /* private setEditable() {
    const sourcePaneState = this.sourceContext?.sourcePaneState
    const { canEdit } = this.sourceContext?.headerMetadata ?? { canEdit: false }
    const subject = this.sourceContext?.subject
    if (!sourcePaneState || !canEdit || sourcePaneState.broken || (subject && subject.endsWith('/'))) return

    this.sourceContext?.setEditing?.()
  } */

  private handleEditingClick () {
    this.fileExplorerContext.edit?.onEdit?.()
  }

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
    return html`
      <div>
        ${this.renderDirtyIndicator()}
        <solid-ui-button variant="ghost" title="Share" @click=${this.fileExplorerContext.handleSharingClick}>
          <icon-lucide-share-2 slot="icon"></icon-lucide-share-2>
        </solid-ui-button>
        <solid-ui-button
          variant="ghost"
          title=${this.getEditTooltip()}
          ?disabled=${!this.fileExplorerContext.paneSupportsEditing || !this.canEdit}
          @click=${this.handleEditingClick}
        >
          <icon-lucide-pencil slot="icon"></icon-lucide-pencil>
        </solid-ui-button>
        <resource-actions-menu
          .store=${this.fileExplorerContext?.store}
          .subjectUri=${this.fileExplorerContext?.subjectUri}
          .menuItems=${this.menuItems}
        ></resource-actions-menu>
      </div>
    `
  }
}
