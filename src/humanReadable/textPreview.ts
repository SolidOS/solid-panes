import type { DataBrowserContext } from 'pane-registry'
import type { NamedNode } from 'rdflib'
import { html, render } from 'lit-html'
import { configurePreviewFrame } from './previewFrame'

type Store = DataBrowserContext['session']['store']

export function renderPlainTextContent (
  store: Store,
  subject: NamedNode,
  frame: HTMLPreElement
): void {
  store.fetcher.webOperation('GET', subject.uri).then(response => {
    const plainText = response.responseText ?? ''
    render(html`${plainText}`, frame)
    configurePreviewFrame(frame, 'plain-text')
  }).catch(error => {
    console.error('Error fetching plain text content:', error)
    render(html`Error loading content`, frame)
  })
}
