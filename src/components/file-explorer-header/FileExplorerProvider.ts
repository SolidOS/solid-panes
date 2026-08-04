import { html, nothing, type PropertyValues } from 'lit'
import type { NamedNode, LiveStore } from 'rdflib'
import { DataBrowserContext, type PaneDefinition } from 'pane-registry'
import { utils, WebComponent } from 'solid-ui'
import { provide } from '@lit/context'
import { fileExplorerContext, type FileExplorerContext, type FileExplorerEdit } from 'solid-ui'
import { customElement, property, state } from 'lit/decorators.js'
import './FileExplorerHeader'
import styles from './FileExplorerProvider.styles.css'
import personIcon from '../../icons/person.svg'
import friendsIcon from '../../icons/friends.svg'

const PERSON_ICON = personIcon
const FRIENDS_ICON = friendsIcon

function createFileExplorerContextValue (value: {
  store: LiveStore | undefined
  subjectUri: string | undefined
  pane?: PaneDefinition
  soloPane?: boolean
  onBack?: () => void
  openPane?: (subject: NamedNode, paneName: string) => void
  handleSharingClick?: () => void
  paneSupportsEditing?: boolean
  edit?: {
    onEdit?: () => void
    isDirty?: boolean
    updateDirtyState?: (dirty: boolean) => void
  }
}): FileExplorerContext {
  return {
    store: value.store as LiveStore,
    subjectUri: value.subjectUri,
    pane: value.pane,
    soloPane: value.soloPane,
    onBack: value.onBack,
    openPane: value.openPane,
    handleSharingClick: value.handleSharingClick,
    paneSupportsEditing: value.paneSupportsEditing,
    edit: value.edit
  }
}
@customElement('file-explorer-provider')
export default class FileExplorerProvider extends WebComponent {
  static styles = styles

  @property({ attribute: false })
  accessor context: DataBrowserContext | undefined = undefined

  @property({ attribute: false })
  accessor subjectUri: string | undefined = undefined

  @property({ attribute: false })
  accessor onBack: (() => void) | undefined = undefined

  @property({ attribute: false })
  accessor relevantPanes: PaneDefinition[] = []

  @property({ attribute: false })
  accessor pane: PaneDefinition | undefined = undefined

  @property({ attribute: false })
  accessor paneRenderOptions: Record<string, unknown> = {}

  @property({ attribute: false })
  accessor showHeader: boolean = true

  @property({ attribute: false })
  accessor handleSharingClick: (() => void) | undefined = undefined

  // TODO: Need to research this more, brought it over from manager.
  @property({ attribute: false })
  accessor soloPane: boolean | undefined = undefined

  @property({ attribute: false })
  accessor openPane: ((subject: NamedNode, paneName: string) => void) | undefined = undefined

  @state()
  accessor menuItems: Array<{ label: string, icon?: HTMLElement, action: (event: Event) => void }> = []

  @state()
  accessor isEditing: boolean = false

  @state()
  accessor isDirty: boolean = false

  @state()
  accessor paneSupportsEditing: boolean = false

  // TODO: For now this works, but check if there is a better way.
  // because this means file explorer will know about the pane.
  // what if other panes want to use this. If so maybe we should
  // add more to the context to capture the provider for the pane that
  // will be editing... anyway this shouldn't be just for source pane.
  private beginEditingInSourcePane = () => {
    const sourceProvider = this.querySelector('source-pane-source-provider') as {
      beginEditing?: () => void
    } | null

    sourceProvider?.beginEditing?.()
  }

  // TODO: same as below. on Edit should be something more generic
  @state()
  accessor edit: FileExplorerEdit = {
    onEdit: this.beginEditingInSourcePane,
    isDirty: false,
    updateDirtyState: (dirty: boolean) => {
      if (this.isDirty === dirty) return

      this.isDirty = dirty
      this.edit = {
        ...this.edit,
        isDirty: dirty
      }
      this.refreshFileExplorerContextValue()
    }
  }

  @provide({ context: fileExplorerContext })
  accessor fileExplorerContextValue: FileExplorerContext = createFileExplorerContextValue({
    store: this.context?.session.store as LiveStore,
    subjectUri: this.subjectUri,
    pane: this.pane,
    soloPane: this.soloPane,
    onBack: this.onBack,
    openPane: this.openPane,
    handleSharingClick: this.handleSharingClick,
    paneSupportsEditing: false,
    edit: this.edit
  })

  // Change the state for the pane so it can show the new icon.
  openSelectedPane (pane: PaneDefinition) {
    const store = this.context?.session.store as LiveStore
    if (!store || !this.subjectUri) return
    this.paneSupportsEditing = pane.name === 'source'
    this.pane = pane
  }

  private getPaneIcon (pane, subject, context) {
    if (!pane) return undefined

    const icon = typeof pane.icon === 'function'
      ? pane.icon(subject, context)
      : pane.icon
    return icon
  }

  private async getPaneItems (subject, context, relevantPanes) {
    const dom = context.dom
    const menuItems = await Promise.all(relevantPanes.map(async pane => {
      const label = pane.label(subject, context)

      let iconSrc = ''
      if (pane.name === 'profile') {
        iconSrc = PERSON_ICON
      } else if (pane.name === 'social') {
        iconSrc = FRIENDS_ICON
      } else {
        iconSrc = await this.getPaneIcon(pane, subject, context)
      }

      const icon = utils.AJARImage(iconSrc, label, label, dom)
      icon.setAttribute('slot', 'left-icon')

      return {
        label,
        icon,
        action: () => this.openPane?.(subject, pane.name)
      }
    }))
    return menuItems
  }

  private refreshFileExplorerContextValue () {
    this.fileExplorerContextValue = createFileExplorerContextValue({
      store: this.context?.session.store as LiveStore,
      subjectUri: this.subjectUri,
      pane: this.pane,
      soloPane: this.soloPane,
      onBack: this.onBack,
      openPane: this.openPane,
      handleSharingClick: this.handleSharingClick,
      paneSupportsEditing: this.paneSupportsEditing,
      edit: this.edit
    })
  }

  private async refreshMenuItems () {
    const store = this.context?.session.store as LiveStore
    if (!store || !this.subjectUri) return

    const subject = store.sym(this.subjectUri)
    const menuItems = await this.getPaneItems(subject, this.context as DataBrowserContext, this.relevantPanes)

    this.menuItems = menuItems
  }

  protected willUpdate (changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties)
    const store = this.context?.session.store as LiveStore
    if (!store) {
      throw new Error('The element is missing the required `context.session.store` value. Ensure the `context` property is set.')
    }
    if (!this.subjectUri) {
      throw new Error('The element is missing the required `subjectUri` property.')
    }

    if (
      changedProperties.has('subjectUri') ||
      changedProperties.has('relevantPanes') ||
      changedProperties.has('context')
    ) {
      this.refreshMenuItems().catch(error => {
        console.warn('Failed to refresh menu items', error)
      })
    }

    if (changedProperties.has('pane') || changedProperties.has('subjectUri') || changedProperties.has('context')) {
      this.paneSupportsEditing = this.pane?.name === 'source'
    }

    if (
      changedProperties.has('context') ||
      changedProperties.has('subjectUri') ||
      changedProperties.has('pane') ||
      changedProperties.has('soloPane') ||
      changedProperties.has('onBack') ||
      changedProperties.has('openPane') ||
      changedProperties.has('handleSharingClick') ||
      changedProperties.has('pane') ||
      changedProperties.has('isDirty')
    ) {
      this.refreshFileExplorerContextValue()
    }
  }

  render () {
    const store = this.context?.session.store as LiveStore
    const subject = store.sym(this.subjectUri as string)
    return html`
      <div class="file-explorer-provider">
        ${this.showHeader
          ? html`
              <file-explorer-header
                .paneIcon=${this.getPaneIcon(this.pane, subject, this.context as DataBrowserContext)}
                .menuItems=${this.menuItems}
                .paneSupportsEditing=${this.paneSupportsEditing}
              ></file-explorer-header>
            `
          : nothing}
        <slot class="pane"></slot>
      </div>
    `
  }
}
