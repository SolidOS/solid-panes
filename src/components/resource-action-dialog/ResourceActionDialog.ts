import { html } from 'lit'
import { property } from 'lit/decorators.js'
import { customElement, WebComponent } from 'solid-ui'
import 'solid-ui/components/button'
import 'solid-ui/components/dialog'
import 'solid-ui/components/dialog-content'
import 'solid-ui/components/dialog-footer'
import 'solid-ui/components/dialog-header'
import '~icons/lucide/x'
import styles from './ResourceActionDialog.styles.css'

@customElement('solid-panes-resource-action-dialog')
export default class ResourceActionDialog extends WebComponent {
  static styles = styles

  @property({ type: String })
  accessor title = ''

  @property({ type: String })
  accessor message = ''

  @property({ type: Boolean })
  accessor confirmation = false

  private result: ((value: boolean) => void) | null = null
  private returnFocus: HTMLElement | null = null

  public open (): Promise<boolean> {
    let activeElement = this.ownerDocument.activeElement
    while (activeElement?.shadowRoot?.activeElement) {
      activeElement = activeElement.shadowRoot.activeElement
    }
    this.returnFocus = activeElement instanceof HTMLElement ? activeElement : null
    return new Promise(resolve => {
      this.result = resolve
    })
  }

  private closeDialog (result: boolean) {
    const dialog = this.shadowRoot?.querySelector('solid-ui-dialog')
    const nativeDialog = dialog?.shadowRoot?.querySelector('dialog')
    this.result?.(result)
    this.result = null
    if (nativeDialog?.open) {
      nativeDialog.close()
    }
    this.remove()
  }

  disconnectedCallback () {
    super.disconnectedCallback()
    this.result?.(false)
    this.result = null
    if (this.returnFocus?.isConnected) {
      this.returnFocus.focus()
    } else {
      const main = this.ownerDocument.querySelector('main')
      if (main) {
        const previousTabIndex = main.getAttribute('tabindex')
        main.tabIndex = -1
        main.focus()
        if (previousTabIndex === null) main.removeAttribute('tabindex')
        else main.setAttribute('tabindex', previousTabIndex)
      }
    }
    this.returnFocus = null
  }

  protected async firstUpdated () {
    super.firstUpdated()
    const dialog = this.shadowRoot?.querySelector<WebComponent>('solid-ui-dialog')
    await dialog?.updateComplete
    const nativeDialog = dialog?.shadowRoot?.querySelector('dialog')
    if (!nativeDialog) throw new Error('Internal pane dialog did not render a native dialog')
    nativeDialog.setAttribute('aria-label', this.title)
    nativeDialog.setAttribute('aria-description', this.message)
    nativeDialog.addEventListener('cancel', event => {
      event.preventDefault()
      this.closeDialog(false)
    })
    nativeDialog.addEventListener('close', () => {
      if (this.isConnected) this.closeDialog(false)
    })
    const initialAction = this.shadowRoot?.querySelector<WebComponent>('[data-initial-action]')
    await initialAction?.updateComplete
    initialAction?.shadowRoot?.querySelector('button')?.focus()
  }

  private handleKeyDown (event: KeyboardEvent) {
    if (event.key !== 'Tab') return
    const buttons = Array.from(this.shadowRoot?.querySelectorAll('solid-ui-button') ?? [])
      .map(component => component.shadowRoot?.querySelector('button'))
      .filter((button): button is HTMLButtonElement => !!button && !button.disabled)
    const focusedIndex = buttons.findIndex(button => {
      const root = button.getRootNode()
      return root instanceof ShadowRoot && root.activeElement === button
    })
    if (event.shiftKey && focusedIndex === 0) {
      event.preventDefault()
      buttons.at(-1)?.focus()
    } else if (!event.shiftKey && focusedIndex === buttons.length - 1) {
      event.preventDefault()
      buttons[0]?.focus()
    }
  }

  protected render () {
    const [mainMessage, ...additionalMessages] = this.message.split('\n')
    return html`
      <solid-ui-dialog @keydown=${this.handleKeyDown}>
        <solid-ui-dialog-header slot="header">
          <h2>${this.title}</h2>
          <solid-ui-button variant="ghost" @click=${() => this.closeDialog(false)}>
            <span class="sr-only">Close dialog</span>
            <icon-lucide-x slot="icon" aria-hidden="true"></icon-lucide-x>
          </solid-ui-button>
        </solid-ui-dialog-header>
        <solid-ui-dialog-content>
          <p>
            ${mainMessage}
            ${additionalMessages.map(message => html`<span class="resource-action-dialog-emphasis">${message}</span>`)}
          </p>
        </solid-ui-dialog-content>
        <solid-ui-dialog-footer slot="footer">
          ${this.confirmation
            ? html`
                <solid-ui-button data-initial-action variant="secondary" @click=${() => this.closeDialog(false)}>
                  Cancel
                </solid-ui-button>
                <solid-ui-button @click=${() => this.closeDialog(true)}>
                  Delete
                </solid-ui-button>
              `
            : html`
                <solid-ui-button data-initial-action @click=${() => this.closeDialog(false)}>
                  OK
                </solid-ui-button>
              `}
        </solid-ui-dialog-footer>
      </solid-ui-dialog>
    `
  }
}
