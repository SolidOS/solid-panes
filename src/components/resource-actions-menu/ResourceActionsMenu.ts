import { showDialog, WebComponent, fileExplorerContext, type FileExplorerContext, log } from 'solid-ui'
import { customElement, property } from 'lit/decorators.js'
import { html, nothing } from 'lit'
import { solidLogicSingleton } from 'solid-logic'
import 'solid-ui/components/button'
import 'solid-ui/components/menu'
import 'solid-ui/components/menu-item'
import DeleteResourceDialog from './DeleteResourceDialog'
import '~icons/lucide/ellipsis-vertical'
import '~icons/lucide/trash-2'
import '~icons/lucide/share-2'
import { type LiveStore, type NamedNode } from 'rdflib'
import { consume } from '@lit/context'

@customElement('resource-actions-menu')
export default class ResourceActionsMenu extends WebComponent {
  @property({ attribute: false })
  accessor store: LiveStore | undefined

  @property({ type: String })
  accessor subjectUri: string | undefined

  @property({ type: String })
  accessor deleteTargetUri: string | undefined

  @consume({ context: fileExplorerContext, subscribe: true })
  accessor fileExplorerContext: FileExplorerContext = undefined as unknown as FileExplorerContext

  @property({ attribute: false })
  accessor menuItems: Array<{ label: string, icon?: HTMLElement, action: (event: Event) => void }> = []

  @property({ type: Boolean })
  accessor showShareItem: boolean = false

  @property({ type: Boolean })
  accessor canDelete: boolean = false

  private async confirmDelete (resourceNode: NamedNode) {
    const store = this.store
    if (!store) return false

    let resourceDetailsLoaded = true
    try {
      await store.fetcher.load(resourceNode.doc())
    } catch (_error) {
      resourceDetailsLoaded = false
    }

    return new Promise<boolean>(resolve => {
      showDialog(DeleteResourceDialog, {
        props: {
          resourceNode: resourceDetailsLoaded ? resourceNode : undefined,
          resourceDetailsLoaded
        },
        onClose: (result) => resolve(result === true)
      })
    })
  }

  private async handleDelete (event: Event) {
    event.preventDefault()

    if (!this.store?.fetcher || !this.subjectUri) return

    const store = this.store
    const deleteTargetUri = this.deleteTargetUri ?? this.subjectUri
    if (!deleteTargetUri) return

    const resourceNode = store.sym(deleteTargetUri)

    const confirmation = await this.confirmDelete(resourceNode)
    if (!confirmation) return

    try {
      await solidLogicSingleton.resource.deleteResourceAndTypeIndexIfExists(resourceNode, solidLogicSingleton.authn.currentUser())
      this.fileExplorerContext?.refresh?.()
    } catch (caughtError) {
      log.debug('Error deleting resource: ' + String(caughtError))
      // TODO: Add a status section here so delete errors can be shown to the user.
    }
  }

  private handleShare = (event: Event) => {
    event.preventDefault()
    this.fileExplorerContext?.handleSharingClick?.()
  }

  render () {
    return html`
      <solid-ui-menu>
        <solid-ui-button slot="trigger" variant="ghost" title="More options">
          <icon-lucide-ellipsis-vertical slot="icon"></icon-lucide-ellipsis-vertical>
        </solid-ui-button>
        ${this.menuItems.map(item => html`
          <solid-ui-menu-item @solid-ui-select=${(event: Event) => item.action(event)}>
            ${item.icon}
            ${item.label}
          </solid-ui-menu-item>
        `)}
        ${this.showShareItem
? html`
          <solid-ui-menu-item @solid-ui-select=${(event: Event) => this.handleShare(event)}>
            <icon-lucide-share-2 slot="left-icon"></icon-lucide-share-2>
            Share
          </solid-ui-menu-item>
        `
: nothing}
        <solid-ui-menu-item ?disabled=${!this.canDelete} @solid-ui-select=${(event: Event) => this.handleDelete(event)}>
          <icon-lucide-trash-2 slot="left-icon"></icon-lucide-trash-2>
          Delete
        </solid-ui-menu-item>
      </solid-ui-menu>
    `
  }
}
