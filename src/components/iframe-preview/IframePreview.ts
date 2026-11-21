import { html, nothing } from 'lit'
import { property, state } from 'lit/decorators.js'
import { customElement, WebComponent } from 'solid-ui'
import type { LiveStore, NamedNode } from 'rdflib'
import {
  documentTitle,
  HTML_PREVIEW_SANDBOX,
  IFRAME_PREVIEW_FRAME_NAME,
  resourceFilename
} from '../../humanReadable/previewHelpers'
import styles from './IframePreview.styles.css'
import 'solid-ui/components/error-state'

@customElement('solid-panes-iframe-preview')
export default class IframePreview extends WebComponent {
  static styles = styles

  @property({ attribute: false })
  accessor store: LiveStore | undefined = undefined

  @property({ attribute: false })
  accessor subject: NamedNode | undefined = undefined

  @state()
  private accessor contentType: string | null = null

  @state()
  private accessor content: string | undefined = undefined

  @state()
  private accessor errorMessage = ''

  @state()
  private accessor dokieliHtml = false

  @state()
  private accessor fetchedTitle = ''

  @property({ attribute: false })
  accessor rememberHtmlType: ((uri: string, isDokieli: boolean) => void) | undefined

  @property({ attribute: false })
  accessor withBaseHref: ((html: string, uri: string) => string) | undefined

  @property({ attribute: false })
  accessor isDokieliHtml: ((html: string) => boolean) | undefined

  @property({ attribute: false })
  accessor mountDokieliBridge:
    ((frame: HTMLIFrameElement, uri: string, html: string) => () => void) | undefined

  private objectUrl: string | undefined
  private removeDokieliBridge = () => {}
  private rawHtml: string | undefined
  private fetchGeneration = 0

  private get previewTitle (): string {
    return this.fetchedTitle || (this.subject?.uri ? resourceFilename(this.subject.uri) : 'preview')
  }

  private dismissError = (): void => {
    this.errorMessage = ''
  }

  private clearPreview (): void {
    this.removeDokieliBridge()
    this.removeDokieliBridge = () => {}
    this.renderRoot.querySelector('iframe')?.removeAttribute('srcdoc')
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl)
      this.objectUrl = undefined
    }
    this.content = undefined
    this.contentType = null
    this.rawHtml = undefined
    this.fetchedTitle = ''
    this.dokieliHtml = false
    this.errorMessage = ''
  }

  private async fetchDocument (): Promise<void> {
    const generation = ++this.fetchGeneration
    const { subject, store } = this
    this.clearPreview()
    if (!subject || !store) return

    const isCurrent = () => this.isConnected &&
      generation === this.fetchGeneration && this.subject === subject && this.store === store

    try {
      const response = await store.fetcher._fetch(subject.uri)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const contentType = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase() ?? null
      const isHtml = contentType === 'text/html' || contentType === 'application/xhtml+xml'

      if (isHtml) {
        const htmlContent = await response.text()
        if (!isCurrent()) return
        this.dokieliHtml = this.isDokieliHtml?.(htmlContent) ?? false
        this.rememberHtmlType?.(subject.uri, this.dokieliHtml)
        this.rawHtml = htmlContent
        this.fetchedTitle = documentTitle(htmlContent, subject.uri)
        this.contentType = contentType
        this.content = this.withBaseHref?.(htmlContent, subject.uri) ?? htmlContent
      } else {
        const blob = await response.blob()
        if (!isCurrent()) return
        this.objectUrl = URL.createObjectURL(blob)
        this.contentType = contentType
        this.content = this.objectUrl
      }
    } catch (error) {
      if (isCurrent()) {
        this.errorMessage = error instanceof Error ? error.message : String(error)
      }
    }
  }

  connectedCallback (): void {
    super.connectedCallback()
    if (this.hasUpdated) this.fetchDocument()
  }

  protected updated (changed: Map<PropertyKey, unknown>): void {
    super.updated(changed)
    if (changed.has('subject') || changed.has('store')) {
      this.fetchDocument()
    } else if (changed.has('content') && this.dokieliHtml && this.rawHtml && this.subject) {
      const frame = this.renderRoot.querySelector<HTMLIFrameElement>('iframe')
      if (frame && this.mountDokieliBridge) {
        this.removeDokieliBridge()
        this.removeDokieliBridge = this.mountDokieliBridge(frame, this.subject.uri, this.rawHtml)
      }
    }
  }

  disconnectedCallback (): void {
    ++this.fetchGeneration
    this.clearPreview()
    super.disconnectedCallback()
  }

  render () {
    const isHtml = this.contentType === 'text/html' || this.contentType === 'application/xhtml+xml'
    return html`
      <section class="editor-card" aria-label=${`Preview of ${this.previewTitle}`}>
        <div class="human-readable-pane__container--iframe">
          <iframe
            class="human-readable-pane__frame--iframe"
            name=${IFRAME_PREVIEW_FRAME_NAME}
            title=${this.previewTitle}
            sandbox=${this.contentType === 'application/pdf' ? nothing : HTML_PREVIEW_SANDBOX}
            src=${isHtml ? nothing : this.content ?? nothing}
            srcdoc=${isHtml && !this.dokieliHtml ? this.content ?? nothing : nothing}
          ></iframe>
        </div>
        ${this.errorMessage
          ? html`<solid-ui-error-state
              title="Unable to load preview"
              .message=${this.errorMessage}
              @close=${this.dismissError}
            ></solid-ui-error-state>`
          : nothing}
      </section>
    `
  }
}
