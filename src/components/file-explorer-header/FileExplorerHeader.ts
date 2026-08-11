import { sym } from 'rdflib'
import { WebComponent, type FileExplorerContext, fileExplorerContext } from 'solid-ui'
import { customElement, property, state } from 'lit/decorators.js'
import { consume } from '@lit/context'
import { html } from 'lit'
import { solidLogicSingleton } from 'solid-logic'
import '~icons/lucide/share-2'
import '~icons/lucide/pencil'
import '~icons/lucide/ellipsis-vertical'
import styles from './FileExplorerHeader.styles.css'
import './FileExplorerHeaderSummary'
import './FileExplorerHeaderControls'
import { PaneIcon, type FileExplorerHeaderMetadata } from './types'

@customElement('file-explorer-header')
export default class FileExplorerHeader extends WebComponent {
  static styles = styles

  private _loadedMetadataForTargetUri: string | undefined

  @consume({ context: fileExplorerContext, subscribe: true })
  accessor fileExplorerContext: FileExplorerContext = undefined as unknown as FileExplorerContext

  @property({ attribute: false })
  accessor menuItems: Array<{ label: string, action: (event: Event) => void }> = []

  @property({ attribute: false })
  accessor paneIcon: PaneIcon = undefined as unknown as PaneIcon

  @property({ type: Boolean })
  accessor isContainerResource: boolean = false

  @state()
  accessor responseMetadata: FileExplorerHeaderMetadata = {
    modified: undefined,
    access: {
      isPublic: false,
      canEdit: false,
      canDelete: false
    },
    aclUri: undefined
  }

  private getDefaultResponseMetadata (): FileExplorerHeaderMetadata {
    return {
      modified: undefined,
      access: {
        isPublic: false,
        canEdit: false,
        canDelete: false
      },
      aclUri: undefined
    }
  }

  protected updated () {
    const loadTargetUri = this.fileExplorerContext?.deleteTargetUri ?? this.fileExplorerContext?.subjectUri
    if (this.fileExplorerContext?.store && loadTargetUri && this._loadedMetadataForTargetUri !== loadTargetUri) {
      this._loadedMetadataForTargetUri = loadTargetUri
      this.loadResponseMetadata()
    }
  }

  private async loadResponseMetadata () {
    if (!this.fileExplorerContext?.store) return

    const subjectUri = this.fileExplorerContext.deleteTargetUri ?? this.fileExplorerContext.subjectUri
    if (!subjectUri) return

    const defaultMetadata = this.getDefaultResponseMetadata()

    try {
      const metadata = await solidLogicSingleton.resource.fetchMetadataWithDelete(sym(subjectUri))
      this.responseMetadata = {
        modified: metadata?.modified ?? defaultMetadata.modified,
        access: metadata?.access ?? defaultMetadata.access,
        aclUri: metadata?.aclUri ?? defaultMetadata.aclUri
      }
    } catch (error) {
      this.responseMetadata = this.getDefaultResponseMetadata()
    }
  }

  render () {
    return html`
      <header>
        <file-explorer-header-summary
          .paneIcon=${this.paneIcon}
          .onBackClick=${this.fileExplorerContext?.onBack}
          .responseMetadata=${this.responseMetadata}
        ></file-explorer-header-summary>
        <file-explorer-header-controls
          .menuItems=${this.menuItems}
          .canEdit=${this.responseMetadata.access.canEdit}
          .canDelete=${this.responseMetadata.access.canDelete ?? false}
          .isContainerResource=${this.isContainerResource}
        ></file-explorer-header-controls>
      </header>
    `
  }
}
