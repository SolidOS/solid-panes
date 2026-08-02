import { customElement, DialogComponent } from 'solid-ui'
import { html } from 'lit'
import { property } from 'lit/decorators.js'

import 'solid-ui/components/button'
import 'solid-ui/components/dialog'
import 'solid-ui/components/dialog-content'
import 'solid-ui/components/dialog-footer'

@customElement('source-pane-delete-resource-dialog')
export default class DeleteResourceDialog extends DialogComponent<boolean> {
  @property({ type: String })
  accessor resourceName = 'this resource'

  protected render () {
    return html`
      <solid-ui-dialog title="Delete resource">
        <solid-ui-dialog-content>
          <p>Are you sure you want to permanently delete ${this.resourceName}?</p>
        </solid-ui-dialog-content>
        <solid-ui-dialog-footer>
          <solid-ui-button variant="secondary" @click=${() => this.close(false)}>
            Go back
          </solid-ui-button>
          <solid-ui-button @click=${() => this.close(true)}>
            Yes
          </solid-ui-button>
        </solid-ui-dialog-footer>
      </solid-ui-dialog>
    `
  }
}