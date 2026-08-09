import { customElement, DialogComponent } from 'solid-ui'
import { utils } from 'solid-ui'
import { html } from 'lit'
import { property } from 'lit/decorators.js'
import { solidLogicSingleton } from 'solid-logic'
import type { NamedNode } from 'rdflib'
import styles from './DeleteResourceDialog.styles.css'

import 'solid-ui/components/button'
import 'solid-ui/components/dialog'
import 'solid-ui/components/dialog-content'
import 'solid-ui/components/dialog-footer'

@customElement('resource-delete-dialog')
export default class DeleteResourceDialog extends DialogComponent<boolean> {
  static styles = styles

  @property({ attribute: false })
  accessor resourceNode: NamedNode = undefined as unknown as NamedNode

  private cancel = () => this.close(false)

  private confirm = () => this.close(true)

  protected render () {
    const resourceLogic = solidLogicSingleton.resource
    const resourceNode = this.resourceNode
    const hasResourceValue = typeof resourceNode?.value === 'string' && resourceNode.value.length > 0
    const resourceLabel = hasResourceValue ? utils.label(resourceNode) : 'this resource'
    const isContainer = hasResourceValue ? resourceLogic.isContainer(resourceNode) : false
    const numberOfContents = hasResourceValue && isContainer
      ? html`<span class="resource-delete-dialog__emphasis">${resourceLogic.getContainerMemberCount(resourceNode)}</span>`
      : null
    const resourceName = html`<span class="resource-delete-dialog__emphasis">${resourceLabel}</span>`
    const message = isContainer
      ? html`Are you sure you want to permanently delete ${resourceName} container and the ${numberOfContents} resources inside?`
      : html`Are you sure you want to permanently delete ${resourceName}?`

    return html`
      <solid-ui-dialog title=${isContainer ? 'Delete container' : 'Delete resource'}>
        <solid-ui-dialog-content>
          <p>${message}</p>
        </solid-ui-dialog-content>
        <solid-ui-dialog-footer>
          <div class="resource-delete-dialog__actions">
            <solid-ui-button variant="secondary" @click=${this.cancel}>
              Cancel
            </solid-ui-button>
            <solid-ui-button @click=${this.confirm}>
              Delete
            </solid-ui-button>
          </div>
        </solid-ui-dialog-footer>
      </solid-ui-dialog>
    `
  }
}
