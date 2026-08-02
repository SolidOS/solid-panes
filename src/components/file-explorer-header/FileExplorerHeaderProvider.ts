import { html, type PropertyValues } from 'lit'
import type { NamedNode } from 'rdflib'
import { provide } from '@lit/context'
import { headerContext, HeaderContext } from './context'
import { customElement, property } from 'lit/decorators.js'
import { LiveStore } from 'rdflib'
import { utils, WebComponent } from 'solid-ui'
import "./FileExplorerHeader"
import { PaneItem } from '../../utils/paneUtils'
import styles from './FileExplorerHeaderProvider.styles.css'
import { DataBrowserContext } from 'pane-registry/src'
import personIcon from '../icons/person.svg'
import friendsIcon from '../icons/friends.svg'

const PERSON_ICON = personIcon
const FRIENDS_ICON = friendsIcon

function createFileExplorerHeaderContextValue(value: {
    store: LiveStore | undefined
    subjectUri: string | undefined
    pane?: PaneItem
    paneName?: string
  
    onBack?: () => void
    openPane?: (paneName: string) => void
    setQueryButtonVisible?: (visible: boolean) => void
  
    canEdit?: boolean
    edit?: {
      onEdit?: () => void
      onSave?: () => void
      onCancel?: () => void
      isEditing?: boolean
    }
}): HeaderContext {
  return {
    store: value.store as LiveStore,
    subjectUri: value.subjectUri,
    pane: value.pane,
    paneName: value.paneName,
    onBack: value.onBack,
    openPane: value.openPane,
    setQueryButtonVisible: value.setQueryButtonVisible,
    canEdit: value.canEdit,
    edit: value.edit
  }
}
@customElement('file-explorer-header-provider')
export default class FileExplorerHeaderProvider extends WebComponent {
  static styles = styles

  @property({ attribute: false })
  accessor context: DataBrowserContext | undefined = undefined

  @property({ attribute: false })
  accessor subjectUri: string | undefined = undefined

  @property({ attribute: false })
  accessor relevantPanes: PaneItem[] = []
  @property({ attribute: false })
  accessor openPane: ((subject: NamedNode, paneName: string) => void) | undefined = undefined

  @provide({ context: headerContext })
  accessor fileExplorerContextValue: HeaderContext = createFileExplorerHeaderContextValue({
    store: this.context?.session.store as LiveStore,
    subjectUri: this.subjectUri,
    pane: undefined,
    paneName: undefined,
    onBack: undefined,
    openPane: undefined,
    setQueryButtonVisible: undefined,
    canEdit: undefined,
    edit: undefined
  })

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

  private refreshFileExplorerHeaderContextValue() {
    this.fileExplorerContextValue = createFileExplorerHeaderContextValue({
      store: this.context?.session.store as LiveStore,
      subjectUri: this.subjectUri,
      pane: this.fileExplorerContextValue.pane,
      paneName: this.fileExplorerContextValue.paneName,
      onBack: this.fileExplorerContextValue.onBack,
      openPane: this.fileExplorerContextValue.openPane,
      setQueryButtonVisible: this.fileExplorerContextValue.setQueryButtonVisible,
      canEdit: this.fileExplorerContextValue.canEdit,
      edit: this.fileExplorerContextValue.edit
    })
  }

  protected willUpdate (changedProperties: PropertyValues<this>) {
    super.willUpdate(changedProperties)
    if (!this.context?.session.store) {
      throw new Error('The element is missing the required `store` property.')
    }
    if (!this.subjectUri) {
      throw new Error('The element is missing the required `subjectUri` property.')
    }

    this.refreshFileExplorerHeaderContextValue()
  }

  render() {

    const store = this.context?.session.store as LiveStore
    const subject = store.sym(this.subjectUri as string)
    
    return html`
      <file-explorer-header 
      .paneIcon=${this.getPaneIcon(this.fileExplorerContextValue.pane, subject, this.context as DataBrowserContext)}
      .menuItems=${this.getPaneItems(store, subject, this.relevantPanes)}></file-explorer-header>
    `
  }
}
