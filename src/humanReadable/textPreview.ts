import { log } from 'solid-ui'
import type { DataBrowserContext } from 'pane-registry'
import type { NamedNode } from 'rdflib'
import { html, render } from 'lit-html'
import { configurePreviewFrame } from './previewFrame'
import { renderPreviewError } from './previewError'

type Store = DataBrowserContext['session']['store']

export function renderPlainTextContent (
  store: Store,
  subject: NamedNode,
  frame: HTMLPreElement,
  status: HTMLElement
): void {
  configurePreviewFrame(frame, 'plain-text')
  store.fetcher.webOperation('GET', subject.uri).then(response => {
    const plainText = response.responseText ?? ''
    render(html`${plainText}`, frame)
  }).catch(error => {
    log.debug(`Error fetching plain text content: ${String(error)}`)
    renderPreviewError(status, 'Unable to load plain text', 'The document could not be loaded.')
    render(html``, frame)
  })
}
