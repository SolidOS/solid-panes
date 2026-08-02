import { WebComponent } from 'solid-ui'
import { customElement, property } from 'lit/decorators.js'
import { html } from 'lit'
import 'solid-ui/components/button'
// import { sourceContext, SourceContext } from '../../primitives/context'
import '~icons/lucide/share-2'
import '~icons/lucide/pencil'
import styles from './FileExplorerHeaderControls.styles.css'
import '../resource-actions-menu/ResourceActionsMenu'
import { LiveStore } from 'rdflib/lib'

@customElement('file-explorer-header-controls')
export default class FileExplorerHeaderControls extends WebComponent {
  static styles = styles

  @property({ type: LiveStore })
  accessor store: LiveStore | undefined

  @property({ type: String })
  accessor subjectUri: string | undefined

  @property({ attribute: false })
  accessor menuItems: Array<{ label: string, action: (event: Event) => void }> = []

  @property({ type: Function })
  accessor handleSharingClick: (() => void) | undefined
  /* private setEditable() {
    const sourcePaneState = this.sourceContext?.sourcePaneState
    const { canEdit } = this.sourceContext?.headerMetadata ?? { canEdit: false }
    const subject = this.sourceContext?.subject
    if (!sourcePaneState || !canEdit || sourcePaneState.broken || (subject && subject.endsWith('/'))) return
  
    this.sourceContext?.setEditing?.()
  } */

  private handleEditingClick() {
    // Implement editing functionality here
  }
  
  render () {
    return html`
      <div>
        <solid-ui-button variant="ghost" title="Share" @click=${this.handleSharingClick}>
          <icon-lucide-share-2 slot="icon"></icon-lucide-share-2>
        </solid-ui-button>
        <solid-ui-button variant="ghost" title="Edit" @click=${this.handleEditingClick}>
          <icon-lucide-pencil slot="icon"></icon-lucide-pencil>
        </solid-ui-button>
        <resource-actions-menu
          .store=${this.store}
          .subjectUri=${this.subjectUri}
          .menuItems=${this.menuItems}
        ></resource-actions-menu>
      </div>
    `
  }
}
