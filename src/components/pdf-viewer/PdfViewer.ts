import { html, nothing, TemplateResult } from 'lit'
import { property, state } from 'lit/decorators.js'
import { customElement, WebComponent } from 'solid-ui'
import type { LiveStore, NamedNode } from 'rdflib'
import { resourceFilename } from '../../humanReadable/previewHelpers'
import 'solid-ui/components/error-state'
import styles from './PdfViewier.styles.css'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

type PdfJsModule = typeof import('pdfjs-dist')
type PdfDocument = Awaited<ReturnType<PdfJsModule['getDocument']>['promise']>
let pdfJsModulePromise: Promise<PdfJsModule> | undefined

function loadPdfJs (): Promise<PdfJsModule> {
  if (!pdfJsModulePromise) {
    pdfJsModulePromise = import('./pdfJs').then(module => module.default)
  }
  return pdfJsModulePromise
}

@customElement('solid-panes-pdf-viewer')
export default class PdfViewer extends WebComponent {
  static styles = styles

  @property({ attribute: false })
  accessor store: LiveStore | undefined = undefined

  @property({ attribute: false })
  accessor subject: NamedNode | undefined = undefined

  @state()
  private accessor errorMessage = ''

  protected pdfJs: PdfJsModule | undefined
  protected pdfData: ArrayBuffer | undefined
  private pdfDocument: PdfDocument | undefined
  private pdfLoadingTask: ReturnType<PdfJsModule['getDocument']> | undefined
  private fetchGeneration = 0
  private effectiveMobileLayout = false
  private readonly maxConcurrentRenders = 2
  private pageObserver: IntersectionObserver | undefined
  private readonly visibleMobilePages = new Set<number>()
  private readonly renderedPages = new Set<number>()
  private renderQueue: Promise<void> = Promise.resolve()
  private readonly handleViewportChange = (): void => {
    const mobile = this.isMobileLayout()
    if (mobile === this.effectiveMobileLayout || !this.pdfDocument) return
    this.effectiveMobileLayout = mobile
    const generation = this.fetchGeneration
    Promise.all([
      this.renderMainCanvases(generation),
      this.renderThumbnailCanvases(generation)
    ]).catch(error => {
      if (generation === this.fetchGeneration) {
        this.errorMessage = error instanceof Error ? error.message : String(error)
      }
    })
  }

  private async renderPageBatch (pageNumbers: number[], generation: number): Promise<void> {
    const render = this.renderQueue.then(async () => {
      const pending = pageNumbers.filter(pageNumber => !this.renderedPages.has(pageNumber))
      const canvases = this.renderRoot.querySelectorAll<HTMLCanvasElement>('.canvas')
      for (let start = 0; start < pending.length; start += this.maxConcurrentRenders) {
        await Promise.all(pending.slice(start, start + this.maxConcurrentRenders).map(async pageNumber => {
          const canvas = canvases[pageNumber - 1]
          if (!canvas) return
          await this.renderPage(pageNumber, canvas, 1.25, generation)
          if (generation === this.fetchGeneration) this.renderedPages.add(pageNumber)
        }))
      }
    })
    this.renderQueue = render.catch(() => {})
    await render
  }

  private observeMobilePages (generation: number): void {
    this.pageObserver?.disconnect()
    if (!this.isMobileLayout() || typeof IntersectionObserver === 'undefined') return
    const pages = this.renderRoot.querySelectorAll<HTMLElement>('.page')
    this.pageObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const pageNumber = Number((entry.target as HTMLElement).dataset.page)
        if (entry.isIntersecting) this.visibleMobilePages.add(pageNumber)
        else this.visibleMobilePages.delete(pageNumber)
      })
      if (this.visibleMobilePages.size === 0) return
      const visible = Array.from(this.visibleMobilePages)
      const firstVisible = Math.min(...visible)
      const lastVisible = Math.max(...visible)
      const keep = new Set(
        Array.from(
          { length: lastVisible - firstVisible + 3 },
          (_, index) => Math.max(1, firstVisible - 1 + index)
        ).filter(pageNumber => pageNumber <= this.pageCount)
      )
      this.releaseDistantPages(keep)
      this.renderPageBatch(Array.from(keep), generation).catch(error => {
        if (generation === this.fetchGeneration) {
          this.errorMessage = error instanceof Error ? error.message : String(error)
        }
      })
    }, { root: this.renderRoot.querySelector('.main'), rootMargin: '800px 0px' })
    pages.forEach(page => this.pageObserver?.observe(page))
  }

  private releaseDistantPages (keep: Set<number>): void {
    if (!this.isMobileLayout()) return
    const canvases = this.renderRoot.querySelectorAll<HTMLCanvasElement>('.canvas')
    this.renderedPages.forEach(pageNumber => {
      if (keep.has(pageNumber)) return
      const canvas = canvases[pageNumber - 1]
      if (canvas) {
        canvas.width = 0
        canvas.height = 0
      }
      this.renderedPages.delete(pageNumber)
    })
  }

  @state()
  private accessor pageCount = 0

  @state()
  private accessor currentPage = 1

  private get previewTitle (): string {
    return this.subject?.uri ? resourceFilename(this.subject.uri) : 'PDF preview'
  }

  private dismissError = (): void => {
    this.errorMessage = ''
  }

  private isMobileLayout (): boolean {
    return this.dataset.layout === 'mobile' ||
      window.matchMedia?.('(max-width: 768px)').matches === true
  }

  private clearDocument (): void {
    this.errorMessage = ''
    this.pdfJs = undefined
    this.pdfData = undefined
    if (this.pdfLoadingTask && !this.pdfLoadingTask.destroyed) {
      this.pdfLoadingTask.destroy()
    }
    this.pdfLoadingTask = undefined
    if (this.pdfDocument) {
      this.pdfDocument.cleanup()
      this.pdfDocument = undefined
    }
    this.pageObserver?.disconnect()
    this.pageObserver = undefined
    this.renderedPages.clear()
    this.visibleMobilePages.clear()
  }

  private selectPage (pageNumber: number): void {
    if (!this.pdfDocument || pageNumber < 1 || pageNumber > this.pageCount) return
    this.currentPage = pageNumber
    const generation = this.fetchGeneration
    this.renderSelectedPage(pageNumber, generation).catch(error => {
      if (generation === this.fetchGeneration) {
        this.errorMessage = error instanceof Error ? error.message : String(error)
      }
    })
  }

  private async renderSelectedPage (pageNumber: number, generation: number): Promise<void> {
    await this.updateComplete
    await this.renderPageBatch([pageNumber], generation)
  }

  private async renderPage (
    pageNumber: number,
    canvas: HTMLCanvasElement,
    scale: number,
    generation: number
  ): Promise<void> {
    if (!this.pdfDocument || generation !== this.fetchGeneration) return
    const page = await this.pdfDocument.getPage(pageNumber)
    if (!this.isConnected || generation !== this.fetchGeneration) return
    const viewport = page.getViewport({ scale })
    const canvasContext = canvas.getContext('2d')
    if (!canvasContext) throw new Error('Unable to create a PDF canvas.')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvas, canvasContext, viewport }).promise
  }

  private async renderMainCanvases (generation: number): Promise<void> {
    await this.updateComplete
    const canvases = this.renderRoot.querySelectorAll<HTMLCanvasElement>('.canvas')
    if (canvases.length === 0) throw new Error('Unable to create a PDF canvas.')
    if (this.isMobileLayout()) {
      const firstPage = Math.max(1, this.currentPage - 2)
      const lastPage = Math.min(this.pageCount, this.currentPage + 2)
      await this.renderPageBatch(
        Array.from({ length: lastPage - firstPage + 1 }, (_, index) => firstPage + index),
        generation
      )
      this.observeMobilePages(generation)
      return
    }
    await this.renderPageBatch([this.currentPage], generation)
    this.releaseDistantPages(new Set([this.currentPage]))
  }

  private async renderThumbnailCanvases (generation: number): Promise<void> {
    if (this.isMobileLayout()) return
    await this.updateComplete
    const canvases = this.renderRoot.querySelectorAll<HTMLCanvasElement>('.thumbnail-canvas')
    for (let start = 0; start < canvases.length; start += this.maxConcurrentRenders) {
      await Promise.all(Array.from(
        { length: Math.min(this.maxConcurrentRenders, canvases.length - start) },
        (_, offset) => this.renderPage(start + offset + 1, canvases[start + offset], 0.18, generation)
      ))
    }
  }

  private async renderMainPage (generation: number): Promise<void> {
    if (!this.pdfJs || !this.pdfData) return

    this.pdfJs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
    const loadingTask = this.pdfJs.getDocument({ data: this.pdfData })
    this.pdfLoadingTask = loadingTask
    const pdfDocument = await loadingTask.promise
    if (!this.isConnected || generation !== this.fetchGeneration) {
      await loadingTask.destroy()
      return
    }

    this.pdfDocument = pdfDocument
    this.effectiveMobileLayout = this.isMobileLayout()
    this.pageCount = pdfDocument.numPages
    this.currentPage = 1
    if (!this.isConnected || generation !== this.fetchGeneration) return

    await this.renderMainCanvases(generation)
    await this.renderThumbnailCanvases(generation)
  }

  private renderThumbnailLayout (): TemplateResult {
    return html`
      <div class="thumbnail-container">
      ${this.pageCount > 0
          ? Array.from({ length: this.pageCount }, (_, index) => html`
              <button
                type="button"
                class="thumbnail"
                aria-label=${`Go to page ${index + 1}`}
                aria-current=${this.currentPage === index + 1 ? 'page' : nothing}
                @click=${() => this.selectPage(index + 1)}
              >
                <div class="thumbnail-content">
                  <canvas class="thumbnail-canvas" aria-hidden="true"></canvas>
                  <span class="thumbnail-label">${index + 1}</span>
                </div>
              </button>
            `)
          : nothing}
        </div>`
  }

  private async fetchDocument (): Promise<void> {
    const generation = ++this.fetchGeneration
    const { subject, store } = this
    this.clearDocument()
    if (!subject || !store) return

    const isCurrent = () => this.isConnected &&
      generation === this.fetchGeneration && this.subject === subject && this.store === store

    try {
      const response = await store.fetcher._fetch(subject.uri)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const pdfData = await response.arrayBuffer()
      if (!isCurrent()) return
      const pdfJs = await loadPdfJs()
      if (!isCurrent()) return
      this.pdfJs = pdfJs
      this.pdfData = pdfData
      await this.renderMainPage(generation)
    } catch (error) {
      if (isCurrent()) {
        this.errorMessage = error instanceof Error ? error.message : String(error)
      }
    }
  }

  connectedCallback (): void {
    super.connectedCallback()
    this.effectiveMobileLayout = this.isMobileLayout()
    window.addEventListener('resize', this.handleViewportChange)
    if (this.hasUpdated) this.fetchDocument()
  }

  protected updated (changed: Map<PropertyKey, unknown>): void {
    super.updated(changed)
    if (changed.has('subject') || changed.has('store')) {
      this.fetchDocument()
    }
  }

  disconnectedCallback (): void {
    window.removeEventListener('resize', this.handleViewportChange)
    ++this.fetchGeneration
    this.clearDocument()
    super.disconnectedCallback()
  }

  render () {
    return html`
      <section class="pdf-viewer" aria-label=${`Preview of ${this.previewTitle}`}>
        <div class="content">
          <main class="main" aria-label="PDF pages" aria-describedby="pdf-preview-description" tabindex="0">
            <span id="pdf-preview-description" class="sr-only">
              This preview displays pages as images. PDF text and links are not accessible in this preview.
            </span>
            ${(this.pageCount > 0 ? Array.from({ length: this.pageCount }, (_, index) => index + 1) : [1]).map(pageNumber => html`
              <div
                class="page"
                data-page=${pageNumber}
                ?data-current=${this.currentPage === pageNumber}
              >
                <canvas class="canvas" role="img" aria-label=${`Page ${pageNumber}, visual preview`}></canvas>
              </div>
            `)}
          </main>
          <aside class="thumbnails" aria-label="Page thumbnails">
            ${this.renderThumbnailLayout()}
          </aside>
        </div>
        ${this.errorMessage
          ? html`<solid-ui-error-state
              title="Unable to load PDF preview"
              .message=${this.errorMessage}
              @close=${this.dismissError}
            ></solid-ui-error-state>`
          : nothing}
      </section>
    `
  }
}
