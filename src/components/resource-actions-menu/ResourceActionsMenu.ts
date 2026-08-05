import { showDialog, utils, WebComponent } from 'solid-ui'
import { customElement, property } from 'lit/decorators.js'
import { html } from 'lit'
import 'solid-ui/components/button'
import 'solid-ui/components/menu'
import 'solid-ui/components/menu-item'
import DeleteResourceDialog from './DeleteResourceDialog'
import '~icons/lucide/ellipsis-vertical'
import '~icons/lucide/trash-2'
import { LiveStore } from 'rdflib'
// TODO: Add Error Status section

@customElement('resource-actions-menu')
export default class ResourceActionsMenu extends WebComponent {
  @property({ attribute: false })
  accessor store: LiveStore | undefined

  @property({ type: String })
  accessor subjectUri: string | undefined

  @property({ attribute: false })
  accessor menuItems: Array<{ label: string, icon?: HTMLElement, action: (event: Event) => void }> = []

  private confirmDelete (resourceName: string) {
    return new Promise<boolean>(resolve => {
      showDialog(DeleteResourceDialog, {
        props: { resourceName },
        onClose: (result) => resolve(result === true)
      })
    })
  }

  /* private gotoParentFolder(resourceUri: string) {
    const sourceContext = this.sourceContext
    const outliner = sourceContext?.context?.getOutliner?.(sourceContext.context.dom)

    if (!outliner) return

    const parentFolderUri = this.getParentFolderUri(resourceUri)
    ;(outliner as any).GotoSubject(sourceContext.context.session.store.sym(parentFolderUri), true, undefined, true, undefined)
  } */

  private async deleteResourceIfPresent (store: LiveStore, uri: string) {
    try {
      await store.fetcher.webOperation('DELETE', uri)
    } catch (err: any) {
      const status = err?.response?.status ?? err?.status
      if (status === 404) return
      throw err
    }
  }

  // TODO: Below is for a file only. I need to move this to a function
  // that function needs to check if it's a container and if so we can do the
  // recursive delete function.
  // dont' forget public and private type indexes.
  private async handleDelete (event: Event) {
    event.preventDefault()

    if (!this.store?.fetcher || !this.subjectUri) return

    const store = this.store
    const resourceNode = store.sym(this.subjectUri)

    const confirmation = await this.confirmDelete(utils.label(resourceNode))
    if (!confirmation) return

    try {
      await this.deleteResourceIfPresent(store, resourceNode.value)

      const aclUri = this.subjectUri + '.acl'
      if (aclUri) {
        await this.deleteResourceIfPresent(store, aclUri)
        store.removeDocument(store.sym(aclUri))
      }

      store.removeDocument(resourceNode)
      // this.gotoParentFolder(resourceNode.value)
    } catch (err) {
      // error('Error deleting resource:', err)
      // getStatusSection()?.showError('Failed to delete resource. Check console for details.')
    }
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
        <solid-ui-menu-item @solid-ui-select=${(event: Event) => this.handleDelete(event)}>
          <icon-lucide-trash-2 slot="left-icon"></icon-lucide-trash-2>
          Delete
        </solid-ui-menu-item>
      </solid-ui-menu>
    `
  }
}
