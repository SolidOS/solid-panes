import DOMPurify from 'dompurify'
import { html, render } from 'lit-html'
import { unsafeHTML } from 'lit-html/directives/unsafe-html.js'
import { log } from 'solid-ui'
import type { DataBrowserContext } from 'pane-registry'
import type { NamedNode } from 'rdflib'
import { configurePreviewFrame } from './previewFrame'
import { renderPreviewError } from './previewError'

type Store = DataBrowserContext['session']['store']

let markdownItPromise: Promise<typeof import('./markdownIt')> | undefined

function loadMarkdownIt (): Promise<typeof import('./markdownIt')> {
  markdownItPromise ??= import('./markdownIt')
  return markdownItPromise
}

export function renderMarkdownContent (
  store: Store,
  subject: NamedNode,
  frame: HTMLDivElement,
  status: HTMLElement
): void {
  configurePreviewFrame(frame, 'markdown')
  store.fetcher.webOperation('GET', subject.uri).then(async response => {
    const markdownText = response.responseText ?? ''
    const MarkdownIt = (await loadMarkdownIt()).default
    const markdown = new MarkdownIt({
      breaks: true,
      html: false,
      linkify: true,
      typographer: true
    })
    const renderedMarkdown = markdown.render(markdownText)
    const sanitizedMarkdown = DOMPurify.sanitize(renderedMarkdown)

    render(html`${unsafeHTML(sanitizedMarkdown)}`, frame)
  }).catch(error => {
    log.debug(`Error fetching markdown content: ${String(error)}`)
    renderPreviewError(status, 'Unable to load Markdown', 'The document could not be loaded.')
    render(html``, frame)
  })
}
