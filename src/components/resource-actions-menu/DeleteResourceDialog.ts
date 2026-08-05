import { customElement, DialogComponent } from 'solid-ui'
import { html } from 'lit'
import { property } from 'lit/decorators.js'

import 'solid-ui/components/button'
import 'solid-ui/components/dialog'
import 'solid-ui/components/dialog-content'
import 'solid-ui/components/dialog-footer'

@customElement('resource-delete-dialog')
export default class DeleteResourceDialog extends DialogComponent<boolean> {
  @property({ type: String })
  accessor resourceName = 'this resource'

  private cancel = () => this.close(false)

  private confirm = () => this.close(true)

  protected render () {
    return html`
      <solid-ui-dialog title="Delete resource">
        <solid-ui-dialog-content>
          <p>Are you sure you want to permanently delete ${this.resourceName}?</p>
        </solid-ui-dialog-content>
        <solid-ui-dialog-footer>
          <solid-ui-button variant="secondary" @click=${this.cancel}>
            Go back
          </solid-ui-button>
          <solid-ui-button @click=${this.confirm}>
            Yes
          </solid-ui-button>
        </solid-ui-dialog-footer>
      </solid-ui-dialog>
    `
  }
}
