import { widgets, utils, WebComponent } from 'solid-ui'
import 'solid-ui/components/button'
import { customElement, property, query, state } from 'lit/decorators.js'
import { html } from 'lit'
import { LiveStore, sym } from 'rdflib'
import { PaneIcon } from './types'
// we will need a context later i think
import '~icons/lucide/globe'
import '~icons/lucide/lock-keyhole'
import '~icons/lucide/arrow-left'
import styles from './FileExplorerHeaderSummary.styles.css'
import { fetchContentAndMetadata, type FileExplorerResourceMetadata } from './helper'


@customElement('file-explorer-header-summary')
export default class FileExplorerHeaderSummary extends WebComponent {
  static styles = styles

  private _draggableSubjectUri: string | undefined
  private _loadedMetadataForUri: string | undefined

  @property({ type: LiveStore })
  accessor store: LiveStore | undefined

  @property({ type: String })
  accessor subjectUri: string | undefined

  @property({ attribute: false })
  accessor paneIcon: PaneIcon

  @state()
  accessor resolvedPaneIcon: string | undefined = undefined

  @property({ type: Function })
  accessor onBackClick: (() => void) | undefined

  @state()
  accessor responseMetadata: Pick<FileExplorerResourceMetadata, 'modified' | 'isPublic'> = {
    modified: undefined,
    isPublic: false
  }

  @query('h1')
  private accessor titleHeading: HTMLHeadingElement | null = null

  private formatModifiedDate (modified: string | undefined) {
    if (!modified) return ''

    const date = new Date(modified)
    if (Number.isNaN(date.getTime())) return modified

    const parts = new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).formatToParts(date)

    const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? ''
    const day = getPart('day')
    const month = getPart('month')
    const year = getPart('year')
    const hour = getPart('hour')
    const minute = getPart('minute')
    const dayPeriod = getPart('dayPeriod').toUpperCase()

    return `${day} ${month}, ${year} at ${hour}:${minute} ${dayPeriod}`
  }

  protected updated () {
    if (this.store && this.subjectUri && this._loadedMetadataForUri !== this.subjectUri) {
      this._loadedMetadataForUri = this.subjectUri
      void this.loadResponseMetadata()
    }

    if (this.resolvedPaneIcon === undefined) {
      void this.resolvePaneIcon()
    }

    if (!this.titleHeading || !this.subjectUri || this._draggableSubjectUri === this.subjectUri) return

    widgets.makeDraggable(this.titleHeading, sym(this.subjectUri)) // doing it this way for now, just to keep the same functionality
    this._draggableSubjectUri = this.subjectUri
  }

  private async loadResponseMetadata () {
    if (!this.store || !this.subjectUri) return

    const { metadata } = await fetchContentAndMetadata(this.store, sym(this.subjectUri))
    this.responseMetadata = {
      modified: metadata.modified,
      isPublic: metadata.isPublic
    }
  }

  private async resolvePaneIcon () {
    if (this.paneIcon == null) {
      this.resolvedPaneIcon = undefined
      return
    }

    const icon = await this.paneIcon
    this.resolvedPaneIcon = icon ?? undefined
  }

  render () {
    const subject = this.subjectUri ? sym(this.subjectUri) : undefined
    const label = subject ? utils.label(subject) : ''
    const modified = this.formatModifiedDate(this.responseMetadata.modified)
    const isPublic = this.responseMetadata.isPublic

    return html`
      <div class="file-explorer-header-summary">
        <solid-ui-button
          variant="ghost"
          @click=${() => this.onBackClick?.()}
          title="Back"
        >
          <icon-lucide-arrow-left></icon-lucide-arrow-left>
        </solid-ui-button>
        <span class="pane-icon">
          ${this.resolvedPaneIcon ? html`<img src=${this.resolvedPaneIcon} alt="" />` : ''}
        </span>
        <div>
          <h1>${label}</h1>
          <p>${modified} ${isPublic ? html`<span class="public"><icon-lucide-globe></icon-lucide-globe> Public</span>` : html`<span class="private"><icon-lucide-lock-keyhole></icon-lucide-lock-keyhole> Private</span>`}</p>
        </div>
      </div>
    `
  }
}
