import { WebComponent } from 'solid-ui'
import { customElement, property } from 'lit/decorators.js'
import { html } from 'lit'
import 'solid-ui/components/button'
import 'solid-ui/components/menu'
import 'solid-ui/components/menu-item'
import '~icons/lucide/ellipsis-vertical'
import { LiveStore } from 'rdflib'
@customElement('resource-actions-menu')
export default class ResourceActionsMenu extends WebComponent {
  @property({ attribute: false })
  accessor store: LiveStore | undefined

  @property({ type: String })
  accessor subjectUri: string | undefined

  @property({ attribute: false })
  accessor menuItems: Array<{ label: string, icon?: HTMLElement, action: (event: Event) => void }> = []

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
      </solid-ui-menu>
    `
  }
}
