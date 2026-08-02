import { WebComponent } from 'solid-ui'
import { customElement, property } from 'lit/decorators.js'
import { html } from 'lit'
// import { sourceContext, SourceContext } from '../../primitives/context'
import '~icons/lucide/share-2'
import '~icons/lucide/pencil'
import '~icons/lucide/ellipsis-vertical'
import styles from './FileExplorerHeader.styles.css'
import './FileExplorerHeaderSummary'
import './FileExplorerHeaderControls'
import { LiveStore } from 'rdflib/lib'
import { PaneIcon } from './types'

@customElement('file-explorer-header')
export default class FileExplorerHeader extends WebComponent {
  static styles = styles

    @property({ type: LiveStore })
    accessor store: LiveStore | undefined
  
    @property({ type: String })
    accessor subjectUri: string | undefined
  
    @property({ attribute: false })
    accessor paneIcon: PaneIcon

    @property({ type: Function })
    accessor onBackClick: (() => void) | undefined

    @property({ attribute: false })
    accessor menuItems: Array<{ label: string, action: (event: Event) => void }> = []
  
    @property({ type: Function })
    accessor handleSharingClick: (() => void) | undefined

  render () {
    return html`
      <header>
        <file-explorer-header-summary
          .store=${this.store}
          .subjectUri=${this.subjectUri}
          .paneIcon=${this.paneIcon}
          .onBackClick=${this.onBackClick}
        ></file-explorer-header-summary>
        <file-explorer-header-controls
          .store=${this.store}
          .subjectUri=${this.subjectUri}
          .menuItems=${this.menuItems}
          .handleSharingClick=${this.handleSharingClick}
        ></file-explorer-header-controls>
      </header>
    `
  }
}
